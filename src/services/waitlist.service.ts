import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError, isUniqueViolation, type Paginated } from "@/lib/api/api-response";
import type { Session } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { waitlistConfirmMessage } from "@/lib/email/templates";
import { readWaitlistToken } from "@/lib/waitlist-links";
import { releaseLinks, waitlistConfirmUrl, type LinkRelease } from "@/lib/waitlist-urls";
import { dispatchEmail } from "@/services/message.service";
import { sendWaitlistWelcome } from "@/services/message-triggers.service";
import { completedWhere } from "@/services/release.service";
import { visibleReleaseWhere } from "@/services/release-storefront.service";
import type {
  AdminWaitlistEntry,
  MyWaitlistEntry,
  WaitlistConfirmResult,
  WaitlistJoinResult,
} from "@/types/storefront-release";
import type { joinWaitlistSchema, updateWaitlistSchema } from "@/validators/waitlist.validator";

type JoinData = z.output<typeof joinWaitlistSchema>;
type UpdateData = z.output<typeof updateWaitlistSchema>;
type SessionUser = Session["user"];

interface PageQuery {
  page: number;
  pageSize: number;
}

export interface JoinOutcome {
  result: WaitlistJoinResult;
  /** Runs after the response: the confirm link for a guest, the welcome for a verified owner. */
  afterJoin: (() => Promise<void>) | null;
}

const MESSAGE_RELEASE_NOT_FOUND = "This release isn't open for sign ups.";
const MESSAGE_LINK_INVALID = "This link has expired or is no longer valid.";
const MESSAGE_ENTRY_NOT_FOUND = "We couldn't find that waitlist entry.";

const invalidLink = () =>
  new ServiceError("VALIDATION", MESSAGE_LINK_INVALID, 422, { token: [MESSAGE_LINK_INVALID] });

const entryNotFound = () => new ServiceError("NOT_FOUND", MESSAGE_ENTRY_NOT_FOUND, 404);

const joinedSelect = { id: true, email: true, releaseId: true, confirmedAt: true } satisfies Prisma.WaitlistEntrySelect;

const mySelect = {
  id: true,
  emailOptIn: true,
  whatsappOptIn: true,
  phone: true,
  confirmedAt: true,
  createdAt: true,
  release: { select: { slug: true, title: true, startsAt: true } },
} satisfies Prisma.WaitlistEntrySelect;

type MyRow = Prisma.WaitlistEntryGetPayload<{ select: typeof mySelect }>;

async function mailConfirmLink(entry: { id: string; email: string; releaseId: string }, release: LinkRelease): Promise<void> {
  const [links, confirmUrl] = await Promise.all([
    releaseLinks(release, entry.id),
    waitlistConfirmUrl(entry.id),
  ]);
  await dispatchEmail({
    trigger: "WAITLIST_WELCOME",
    recipient: entry.email,
    refId: entry.releaseId,
    refLabel: `Release ${release.title}`,
    build: async () => waitlistConfirmMessage({ ...links, confirmUrl }),
  });
}

function provenOwnerId(session: Session | null, email: string): string | null {
  const user = session?.user;
  return user && user.emailVerified && user.email.toLowerCase() === email ? user.id : null;
}

async function upsertEntry(
  create: Prisma.WaitlistEntryUncheckedCreateInput,
  update: Prisma.WaitlistEntryUncheckedUpdateInput,
) {
  const run = () =>
    prisma.waitlistEntry.upsert({
      where: { releaseId_email: { releaseId: create.releaseId, email: create.email } },
      create,
      update,
      select: joinedSelect,
    });
  try {
    return await run();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return run();
  }
}

export async function joinWaitlist(slug: string, data: JoinData, session: Session | null): Promise<JoinOutcome> {
  const now = new Date();
  const release = await prisma.release.findFirst({
    where: { AND: [visibleReleaseWhere(now), { slug }] },
    select: { id: true, slug: true, title: true },
  });
  if (!release) throw new ServiceError("NOT_FOUND", MESSAGE_RELEASE_NOT_FOUND, 404);

  const ownerId = provenOwnerId(session, data.email);
  const preferences = { emailOptIn: data.emailOptIn, whatsappOptIn: data.whatsappOptIn, phone: data.phone };
  const entry = await upsertEntry(
    { releaseId: release.id, email: data.email, ...preferences, userId: ownerId, confirmedAt: ownerId ? now : null },
    ownerId ? { ...preferences, userId: ownerId } : {},
  );

  if (ownerId) {
    if (!entry.confirmedAt) {
      await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { confirmedAt: now } });
    }
    // The welcome's key is per entry, so joining again never sends a second one.
    return { result: { status: "CONFIRMED" }, afterJoin: () => sendWaitlistWelcome(entry.id) };
  }

  return {
    result: { status: "CHECK_INBOX" },
    afterJoin: entry.confirmedAt ? null : () => mailConfirmLink(entry, release),
  };
}

export async function confirmEntry(token: string): Promise<WaitlistConfirmResult> {
  const entryId = readWaitlistToken(token, "confirm");
  if (!entryId) throw invalidLink();
  const { count } = await prisma.waitlistEntry.updateMany({
    where: { id: entryId, confirmedAt: null },
    data: { confirmedAt: new Date() },
  });
  if (count > 0) await sendWaitlistWelcome(entryId);
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    select: { release: { select: { slug: true, title: true } } },
  });
  if (!entry) throw invalidLink();
  return { releaseSlug: entry.release.slug, releaseTitle: entry.release.title };
}

export async function leaveWaitlist(token: string): Promise<void> {
  const entryId = readWaitlistToken(token, "leave");
  if (!entryId) throw invalidLink();
  await prisma.waitlistEntry.deleteMany({ where: { id: entryId } });
}

export async function purgeEndedWaitlists(now: Date): Promise<void> {
  const { count } = await prisma.waitlistEntry.deleteMany({ where: { release: completedWhere(now) } });
  if (count > 0) console.info(`deleted ${count} waitlist entries of completed releases`);
}

function ownedWhere(user: SessionUser): Prisma.WaitlistEntryWhereInput {
  return user.emailVerified
    ? { OR: [{ userId: user.id }, { email: user.email.toLowerCase() }] }
    : { userId: user.id };
}

function toMyEntry(row: MyRow): MyWaitlistEntry {
  return {
    id: row.id,
    releaseSlug: row.release.slug,
    releaseTitle: row.release.title,
    startsAt: row.release.startsAt.toISOString(),
    emailOptIn: row.emailOptIn,
    whatsappOptIn: row.whatsappOptIn,
    phone: row.phone,
    confirmed: row.confirmedAt !== null,
    joinedAt: row.createdAt.toISOString(),
  };
}

export async function listMyWaitlists(
  user: SessionUser,
  { page, pageSize }: PageQuery,
): Promise<Paginated<MyWaitlistEntry>> {
  const where = ownedWhere(user);
  const [rows, total] = await prisma.$transaction([
    prisma.waitlistEntry.findMany({
      where,
      select: mySelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.waitlistEntry.count({ where }),
  ]);
  return { items: rows.map(toMyEntry), page, pageSize, total };
}

export async function updateMyWaitlist(user: SessionUser, id: string, data: UpdateData): Promise<MyWaitlistEntry> {
  const owned = await prisma.waitlistEntry.findFirst({ where: { AND: [{ id }, ownedWhere(user)] }, select: { id: true } });
  if (!owned) throw entryNotFound();
  const row = await prisma.waitlistEntry.update({
    where: { id },
    data: { emailOptIn: data.emailOptIn, whatsappOptIn: data.whatsappOptIn, phone: data.phone },
    select: mySelect,
  });
  return toMyEntry(row);
}

export async function deleteMyWaitlist(user: SessionUser, id: string): Promise<{ id: string }> {
  const { count } = await prisma.waitlistEntry.deleteMany({ where: { AND: [{ id }, ownedWhere(user)] } });
  if (count === 0) throw entryNotFound();
  return { id };
}

export async function listReleaseWaitlist(
  releaseId: string,
  { page, pageSize }: PageQuery,
): Promise<Paginated<AdminWaitlistEntry>> {
  const where = { releaseId };
  const [rows, total] = await prisma.$transaction([
    prisma.waitlistEntry.findMany({
      where,
      select: {
        id: true,
        email: true,
        emailOptIn: true,
        whatsappOptIn: true,
        phone: true,
        confirmedAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.waitlistEntry.count({ where }),
  ]);
  return {
    items: rows.map(({ confirmedAt, createdAt, ...row }) => ({
      ...row,
      confirmedAt: confirmedAt ? confirmedAt.toISOString() : null,
      joinedAt: createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
  };
}
