import "server-only";

import { appUrl } from "@/lib/app-url";
import { MESSAGE_SWEEP_BATCH, SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatStoreDateTime } from "@/lib/dates";
import { accountReactivatedMessage, backInStockMessage, waitlistWelcomeMessage } from "@/lib/email/message-templates";
import { SKIP_REASONS, dedupeKey } from "@/lib/messaging";
import { releaseLinks } from "@/lib/waitlist-urls";
import { dispatchEmail } from "@/services/message.service";

/**
 * Messages sent the moment something happens: a waitlist place confirmed, an
 * account restored, units back in stock. Each one reads the live record,
 * checks the customer's opt in, and sends through `dispatchEmail`, which
 * records the outcome and never throws. The timed messages (reminders, drop
 * live, abandoned checkout, warranty notices) are in
 * `message-scheduler.service.ts`. See docs/MESSAGING.md.
 */

const SIGN_IN_LABEL = "Sign in";

const entrySelect = {
  id: true,
  email: true,
  emailOptIn: true,
  userId: true,
  confirmedAt: true,
  release: { select: { id: true, slug: true, title: true, startsAt: true } },
} as const;

/** A confirmed waitlist place: welcome the customer and say when the release opens. */
export async function sendWaitlistWelcome(entryId: string): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({ where: { id: entryId }, select: entrySelect });
    if (!entry || !entry.confirmedAt) return;

    await dispatchEmail({
      trigger: "WAITLIST_WELCOME",
      recipient: entry.email,
      userId: entry.userId,
      refId: entry.release.id,
      refLabel: `Release ${entry.release.title}`,
      dedupeKey: dedupeKey("WAITLIST_WELCOME", entry.id, "confirmed"),
      blocked: entry.emailOptIn ? null : SKIP_REASONS.noEmailOptIn,
      build: async () =>
        waitlistWelcomeMessage({
          ...(await releaseLinks(entry.release, entry.id)),
          opensAt: formatStoreDateTime(entry.release.startsAt.toISOString()),
          started: entry.release.startsAt.getTime() <= Date.now(),
        }),
    });
  } catch (error) {
    console.error(`waitlist welcome for entry ${entryId} failed`, error);
  }
}

/**
 * Units of a sold out release came back. Tells every confirmed, opted in
 * waitlister, a page at a time. Checks the release is open and has units
 * again, so nothing goes out for stock that isn't there.
 */
export async function notifyBackInStock(releaseId: string): Promise<void> {
  try {
    const now = new Date();
    const release = await prisma.release.findFirst({
      where: {
        id: releaseId,
        publishedAt: { not: null },
        hidden: false,
        completedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        allocations: { some: { available: { gt: 0 } } },
      },
      select: { id: true },
    });
    if (!release) return;

    const eventTime = now.getTime();
    let cursor: string | undefined;
    for (;;) {
      const entries = await prisma.waitlistEntry.findMany({
        where: { releaseId, confirmedAt: { not: null }, emailOptIn: true },
        select: entrySelect,
        orderBy: { id: "asc" },
        take: MESSAGE_SWEEP_BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const entry of entries) {
        await dispatchEmail({
          trigger: "BACK_IN_STOCK",
          recipient: entry.email,
          userId: entry.userId,
          refId: releaseId,
          refLabel: `Release ${entry.release.title}`,
          dedupeKey: dedupeKey("BACK_IN_STOCK", releaseId, eventTime, entry.id),
          build: async () => backInStockMessage(await releaseLinks(entry.release, entry.id)),
        });
      }
      if (entries.length < MESSAGE_SWEEP_BATCH) return;
      cursor = entries[entries.length - 1].id;
    }
  } catch (error) {
    console.error(`back in stock messages for release ${releaseId} failed`, error);
  }
}

/** An account came back from Trash: tell its owner and point them at sign in. */
export async function notifyAccountReactivated(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, state: "ACTIVE" },
      select: { id: true, email: true, fullName: true },
    });
    if (!user) return;

    await dispatchEmail({
      trigger: "ACCOUNT_REACTIVATION",
      recipient: user.email,
      userId: user.id,
      refId: user.id,
      refLabel: "Account restored",
      build: async () =>
        accountReactivatedMessage({
          name: user.fullName,
          url: await appUrl(SIGN_IN_PAGE_PATH),
          linkLabel: SIGN_IN_LABEL,
        }),
    });
  } catch (error) {
    console.error(`account reactivation message for user ${userId} failed`, error);
  }
}
