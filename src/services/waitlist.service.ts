import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError, isUniqueViolation, type Paginated } from "@/lib/api/api-response";
import { appUrl } from "@/lib/app-url";
import type { Session } from "@/lib/auth/session";
import { RELEASES_PAGE_PATH, WAITLIST_CONFIRM_PAGE_PATH, WAITLIST_LEAVE_PAGE_PATH } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { releaseHref } from "@/lib/releases";
import { sendEmail } from "@/lib/email/send-email";
import { waitlistConfirmMessage } from "@/lib/email/templates";
import { readWaitlistToken, waitlistToken, type WaitlistLinkPurpose } from "@/lib/waitlist-links";
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

interface LinkRelease {
  slug: string | null;
  title: string;
}

export interface JoinOutcome {
  result: WaitlistJoinResult;
  sendConfirmEmail: (() => Promise<void>) | null;
}

const MESSAGE_RELEASE_NOT_FOUND = "This release isn't open for sign ups.";
const MESSAGE_LINK_INVALID = "This link has expired or is no longer valid.";
const MESSAGE_ENTRY_NOT_FOUND = "We couldn't find that waitlist entry.";

const invalidLink = () =>
  new ServiceError("VALIDATION", MESSAGE_LINK_INVALID, 422, { token: [MESSAGE_LINK_INVALID] });

const entryNotFound = () => new ServiceError("NOT_FOUND", MESSAGE_ENTRY_NOT_FOUND, 404);

const joinedSelect = { id: true, email: true, confirmedAt: true } satisfies Prisma.WaitlistEntrySelect;

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

function tokenUrl(path: string, entryId: string, purpose: WaitlistLinkPurpose): Promise<string> {
  return appUrl(`${path}?${new URLSearchParams({ token: waitlistToken(entryId, purpose) })}`);
}

async function releaseLinks(release: LinkRelease, entryId: string) {
  const [url, leaveUrl] = await Promise.all([
    appUrl(release.slug ? releaseHref(release.slug) : RELEASES_PAGE_PATH),
    tokenUrl(WAITLIST_LEAVE_PAGE_PATH, entryId, "leave"),
  ]);
  return { title: release.title, url, leaveUrl };
}

async function mailConfirmLink(entry: { id: string; email: string }, release: LinkRelease): Promise<void> {
  const [links, confirmUrl] = await Promise.all([
    releaseLinks(release, entry.id),
    tokenUrl(WAITLIST_CONFIRM_PAGE_PATH, entry.id, "confirm"),
  ]);
  await sendEmail({ to: entry.email, ...waitlistConfirmMessage({ ...links, confirmUrl }) });
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
    return { result: { status: "CONFIRMED" }, sendConfirmEmail: null };
  }

  return {
    result: { status: "CHECK_INBOX" },
    sendConfirmEmail: entry.confirmedAt ? null : () => mailConfirmLink(entry, release),
  };
}

export async function confirmEntry(token: string): Promise<WaitlistConfirmResult> {
  const entryId = readWaitlistToken(token, "confirm");
  if (!entryId) throw invalidLink();
  await prisma.waitlistEntry.updateMany({
    where: { id: entryId, confirmedAt: null },
    data: { confirmedAt: new Date() },
  });
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
