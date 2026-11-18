import "server-only";

import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { isUniqueViolation, type Paginated } from "@/lib/api/api-response";
import { MESSAGE_MAX_ATTEMPTS, MESSAGE_REASON_MAX_LENGTH, MESSAGE_SUBJECT_MAX_LENGTH } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { EmailContent } from "@/lib/email/email-outcome";
import { sendEmail } from "@/lib/email/send-email";
import { SKIP_REASONS, canRetry, whatsappAllowed, type MessageChannel, type MessageTrigger } from "@/lib/messaging";
import { sendWhatsApp } from "@/lib/whatsapp/send-whatsapp";
import type { WhatsAppMessage } from "@/lib/whatsapp/templates";
import type { MessageLogEntry } from "@/types/message";
import type { messageListQuerySchema } from "@/validators/message.validator";

/**
 * The one door every automated email and WhatsApp message goes through. It
 * claims the event in `MessageLog` first (so the same event never sends twice),
 * builds the content from live data only when it is really going out, sends,
 * and saves the outcome: SENT, FAILED with the error, or SKIPPED with the
 * reason. It never throws, so a message problem can't undo the change that
 * caused it. See docs/MESSAGING.md.
 */

export type DispatchResult = "SENT" | "FAILED" | "SKIPPED" | "DUPLICATE";

interface DispatchBase {
  trigger: MessageTrigger;
  /** The email address or phone number. */
  recipient: string;
  userId?: string | null;
  /** The record the event came from, and its readable name. */
  refId?: string | null;
  refLabel?: string;
  /** One key per event. Leave out for an event that may repeat, like a resent link. */
  dedupeKey?: string;
  /** A reason to record as skipped instead of sending (no opt in, no phone). */
  blocked?: string | null;
}

export interface EmailDispatch extends DispatchBase {
  build: () => Promise<EmailContent>;
}

export interface WhatsAppDispatch extends DispatchBase {
  build: () => Promise<WhatsAppMessage>;
}

type Delivery = { status: "SENT"; note: string } | { status: "SKIPPED"; reason: string };

const NOTE_CONSOLE_ONLY = "Printed to the server log only: email isn't set up on this server.";
const MESSAGE_UNKNOWN_ERROR = "The message could not be sent.";

const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

async function claim(channel: MessageChannel, input: DispatchBase): Promise<string | null> {
  const dedupeKey = input.dedupeKey ?? randomUUID();
  try {
    const row = await prisma.messageLog.create({
      data: {
        trigger: input.trigger,
        channel,
        recipient: input.recipient,
        userId: input.userId ?? null,
        refId: input.refId ?? null,
        refLabel: input.refLabel ?? "",
        dedupeKey,
      },
      select: { id: true },
    });
    return row.id;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  // The event was seen before: only a failed send with attempts left may run again.
  const existing = await prisma.messageLog.findUnique({
    where: { dedupeKey },
    select: { id: true, status: true, attempts: true },
  });
  if (!existing || existing.status !== "FAILED" || !canRetry(existing.attempts)) return null;
  const { count } = await prisma.messageLog.updateMany({
    where: { id: existing.id, status: "FAILED", attempts: existing.attempts },
    data: { status: "SENDING", attempts: { increment: 1 }, reason: "" },
  });
  return count === 1 ? existing.id : null;
}

function errorReason(error: unknown): string {
  return clip(error instanceof Error ? error.message : MESSAGE_UNKNOWN_ERROR, MESSAGE_REASON_MAX_LENGTH);
}

async function dispatch<Content>(
  channel: MessageChannel,
  input: DispatchBase & { build: () => Promise<Content> },
  deliver: (content: Content) => Promise<Delivery>,
  subjectOf: (content: Content) => string,
): Promise<DispatchResult> {
  try {
    const id = await claim(channel, input);
    if (!id) return "DUPLICATE";

    if (input.blocked) {
      await prisma.messageLog.update({ where: { id }, data: { status: "SKIPPED", reason: input.blocked } });
      return "SKIPPED";
    }

    try {
      const content = await input.build();
      const subject = clip(subjectOf(content), MESSAGE_SUBJECT_MAX_LENGTH);
      const delivery = await deliver(content);
      if (delivery.status === "SKIPPED") {
        await prisma.messageLog.update({ where: { id }, data: { status: "SKIPPED", subject, reason: delivery.reason } });
        return "SKIPPED";
      }
      await prisma.messageLog.update({
        where: { id },
        data: { status: "SENT", subject, reason: delivery.note, sentAt: new Date() },
      });
      return "SENT";
    } catch (error) {
      console.error(`${input.trigger} ${channel} message failed`, error);
      await prisma.messageLog.update({ where: { id }, data: { status: "FAILED", reason: errorReason(error) } });
      return "FAILED";
    }
  } catch (error) {
    console.error(`${input.trigger} ${channel} message could not be recorded`, error);
    return "FAILED";
  }
}

export function dispatchEmail(input: EmailDispatch): Promise<DispatchResult> {
  return dispatch(
    "EMAIL",
    input,
    async (content): Promise<Delivery> => {
      const result = await sendEmail({ to: input.recipient, ...content });
      return { status: "SENT", note: result === "LOGGED" ? NOTE_CONSOLE_ONLY : "" };
    },
    (content) => content.subject,
  );
}

/** WhatsApp is limited to the release sequence; any other trigger is recorded as skipped. */
export function dispatchWhatsApp(input: WhatsAppDispatch): Promise<DispatchResult> {
  const blocked = whatsappAllowed(input.trigger) ? input.blocked : SKIP_REASONS.whatsappNotAllowed;
  return dispatch(
    "WHATSAPP",
    { ...input, blocked },
    async (message): Promise<Delivery> => {
      const result = await sendWhatsApp(input.recipient, message);
      return result === "SENT"
        ? { status: "SENT", note: "" }
        : { status: "SKIPPED", reason: SKIP_REASONS.whatsappNotConfigured };
    },
    (message) => message.template,
  );
}

/* ---------- reading ---------- */

type ListQuery = z.output<typeof messageListQuerySchema>;

const entrySelect = {
  id: true,
  trigger: true,
  channel: true,
  status: true,
  recipient: true,
  subject: true,
  reason: true,
  refLabel: true,
  attempts: true,
  sentAt: true,
  createdAt: true,
  user: { select: { fullName: true } },
} satisfies Prisma.MessageLogSelect;

type Row = Prisma.MessageLogGetPayload<{ select: typeof entrySelect }>;

function toEntry({ user, sentAt, createdAt, ...row }: Row): MessageLogEntry {
  return {
    ...row,
    customerName: user?.fullName ?? null,
    createdAt: createdAt.toISOString(),
    sentAt: sentAt ? sentAt.toISOString() : null,
  };
}

/** A customer's own messages: sent to their account, or to their email or phone before they had one. */
async function customerWhere(userId: string): Promise<Prisma.MessageLogWhereInput> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } });
  const addresses = [user?.email, user?.phone].filter((value): value is string => Boolean(value));
  return { OR: [{ userId }, ...(addresses.length > 0 ? [{ recipient: { in: addresses } }] : [])] };
}

export async function listMessages({
  page,
  pageSize,
  userId,
  status,
  channel,
  trigger,
  search,
}: ListQuery): Promise<Paginated<MessageLogEntry>> {
  const where: Prisma.MessageLogWhereInput = {
    AND: [
      userId ? await customerWhere(userId) : {},
      {
        ...(status ? { status } : {}),
        ...(channel ? { channel } : {}),
        ...(trigger ? { trigger } : {}),
        ...(search
          ? {
              OR: [
                { recipient: { contains: search, mode: "insensitive" } },
                { subject: { contains: search, mode: "insensitive" } },
                { refLabel: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    ],
  };

  const [rows, total] = await prisma.$transaction([
    prisma.messageLog.findMany({
      where,
      select: entrySelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.messageLog.count({ where }),
  ]);
  return { items: rows.map(toEntry), page, pageSize, total };
}

/* ---------- lookups for the scheduler ---------- */

/** A send that needs no further attempt: sent, skipped, or failed with no attempts left. */
const settled: Prisma.MessageLogWhereInput = {
  OR: [{ status: { not: "FAILED" } }, { attempts: { gte: MESSAGE_MAX_ATTEMPTS } }],
};

/** Recipients of a trigger and record whose key starts with `keyPrefix` that are already settled. */
export async function settledRecipients(trigger: MessageTrigger, refId: string, keyPrefix: string): Promise<string[]> {
  const rows = await prisma.messageLog.findMany({
    where: { AND: [{ trigger, refId, dedupeKey: { startsWith: keyPrefix } }, settled] },
    select: { recipient: true },
  });
  return rows.map((row) => row.recipient);
}

/** Records of a trigger since `since` that are settled, so a sweep can leave them out. */
export async function settledRefs(trigger: MessageTrigger, since: Date): Promise<string[]> {
  const rows = await prisma.messageLog.findMany({
    where: { AND: [{ trigger, refId: { not: null }, createdAt: { gte: since } }, settled] },
    select: { refId: true },
  });
  return rows.map((row) => row.refId).filter((refId): refId is string => refId !== null);
}
