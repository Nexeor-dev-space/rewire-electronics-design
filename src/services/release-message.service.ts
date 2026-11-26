import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { appUrl } from "@/lib/app-url";
import {
  MESSAGE_SCHEDULE_GRACE_MINUTES,
  MESSAGE_SWEEP_BATCH,
  MS_PER_DAY,
  MS_PER_MINUTE,
  RELEASE_REMINDER_LOOKAHEAD_DAYS,
  RELEASE_TEST_EMAIL_SUBJECT_PREFIX,
  RELEASE_TEST_ENTRY_ID,
} from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import type { EmailContent } from "@/lib/email/email-outcome";
import {
  campaignMessage,
  dropLiveMessage,
  dropReminderMessage,
  releaseCountdownMessage,
  waitlistWelcomeMessage,
  type ReleaseEmailInput,
} from "@/lib/email/message-templates";
import { sendEmail } from "@/lib/email/send-email";
import { waitlistConfirmMessage } from "@/lib/email/templates";
import { dedupeKey, isDue, reminderDueAt, reminderTrigger, timeUntilLabel, type MessageTrigger } from "@/lib/messaging";
import { releaseHref } from "@/lib/releases";
import { releaseLinks, waitlistConfirmUrl } from "@/lib/waitlist-urls";
import { dropLiveWhatsApp, releaseCountdownWhatsApp } from "@/lib/whatsapp/templates";
import { dispatchEmail, dispatchWhatsApp, settledRecipients } from "@/services/message.service";
import { releaseNotFound } from "@/services/release.service";
import type { SessionUser } from "@/types/auth";
import type { ReleaseTestEmailsResult } from "@/types/release";

/**
 * The release sequence and campaign messages, sent by the scheduler when a
 * moment arrives. Recipients are the confirmed waitlist entries of the
 * release. Email needs the entry's email opt in. WhatsApp is used only for
 * countdown, drop reminder and drop live, only with the WhatsApp opt in and
 * a phone. A sweep sends at most `MESSAGE_SWEEP_BATCH` per message type and
 * release, and the next sweep carries on with whoever is left. The one
 * exception is `sendReleaseTestEmails`, which sends a release's emails to the
 * signed in admin and records nothing. See docs/MESSAGING.md.
 */

type ReleaseTrigger = Extract<MessageTrigger, "COUNTDOWN_UPDATE" | "DROP_REMINDER" | "DROP_LIVE">;

interface SequenceRelease {
  id: string;
  slug: string | null;
  title: string;
  startsAt: Date;
  reminderOffsetsMinutes: number[];
}

const releaseSelect = {
  id: true,
  slug: true,
  title: true,
  startsAt: true,
  reminderOffsetsMinutes: true,
} satisfies Prisma.ReleaseSelect;

const entrySelect = {
  id: true,
  email: true,
  phone: true,
  userId: true,
} satisfies Prisma.WaitlistEntrySelect;

const confirmed = { confirmedAt: { not: null } } satisfies Prisma.WaitlistEntryWhereInput;
const publishedAndShown = { publishedAt: { not: null }, hidden: false, completedAt: null } satisfies Prisma.ReleaseWhereInput;

function minutesAgo(now: Date, minutes: number): Date {
  return new Date(now.getTime() - minutes * MS_PER_MINUTE);
}

/* ---------- release sequence ---------- */

interface SequenceTiming {
  timeLeft: string;
  opensAt: string;
}

function sequenceEmail(trigger: ReleaseTrigger, links: ReleaseEmailInput, timing: SequenceTiming): EmailContent {
  if (trigger === "COUNTDOWN_UPDATE") return releaseCountdownMessage({ ...links, ...timing });
  if (trigger === "DROP_REMINDER") return dropReminderMessage({ ...links, ...timing });
  return dropLiveMessage(links);
}

async function emailWave(release: SequenceRelease, trigger: ReleaseTrigger, part: string, now: Date) {
  const prefix = `${dedupeKey(trigger, "EMAIL", release.id, part)}:`;
  const handled = await settledRecipients(trigger, release.id, prefix);
  const entries = await prisma.waitlistEntry.findMany({
    where: { releaseId: release.id, ...confirmed, emailOptIn: true, email: { notIn: handled } },
    select: entrySelect,
    orderBy: { id: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });

  for (const entry of entries) {
    await dispatchEmail({
      trigger,
      recipient: entry.email,
      userId: entry.userId,
      refId: release.id,
      refLabel: `Release ${release.title}`,
      dedupeKey: `${prefix}${entry.id}`,
      build: async () =>
        sequenceEmail(trigger, await releaseLinks(release, entry.id), {
          timeLeft: timeUntilLabel(now, release.startsAt),
          opensAt: formatStoreDateTime(release.startsAt.toISOString()),
        }),
    });
  }
}

async function whatsappWave(release: SequenceRelease, trigger: ReleaseTrigger, part: string, now: Date) {
  const prefix = `${dedupeKey(trigger, "WHATSAPP", release.id, part)}:`;
  const handled = await settledRecipients(trigger, release.id, prefix);
  const entries = await prisma.waitlistEntry.findMany({
    where: { releaseId: release.id, ...confirmed, whatsappOptIn: true, phone: { not: null, notIn: handled } },
    select: entrySelect,
    orderBy: { id: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });

  for (const entry of entries) {
    if (!entry.phone) continue;
    await dispatchWhatsApp({
      trigger,
      recipient: entry.phone,
      userId: entry.userId,
      refId: release.id,
      refLabel: `Release ${release.title}`,
      dedupeKey: `${prefix}${entry.id}`,
      build: async () => {
        const url = await appUrl(releaseHref(release.slug ?? ""));
        if (trigger === "DROP_LIVE") return dropLiveWhatsApp({ title: release.title, url });
        return releaseCountdownWhatsApp(trigger, {
          title: release.title,
          url,
          timeLeft: timeUntilLabel(now, release.startsAt),
          opensAt: formatStoreDateTime(release.startsAt.toISOString()),
        });
      },
    });
  }
}

async function sendWave(release: SequenceRelease, trigger: ReleaseTrigger, part: string, now: Date) {
  await emailWave(release, trigger, part, now);
  await whatsappWave(release, trigger, part, now);
}

/**
 * Countdown updates and drop reminders at each saved offset before an
 * opening, and the drop live message at the opening. A moment is skipped
 * once it is too far past, and a release that is moved gets new keys, so its
 * waitlist hears the new time.
 */
export async function sweepReleaseSequence(now: Date): Promise<void> {
  const upcoming = await prisma.release.findMany({
    where: {
      ...publishedAndShown,
      slug: { not: null },
      startsAt: { gt: now, lte: new Date(now.getTime() + RELEASE_REMINDER_LOOKAHEAD_DAYS * MS_PER_DAY) },
    },
    select: releaseSelect,
    orderBy: { startsAt: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });
  for (const release of upcoming) {
    for (const offset of release.reminderOffsetsMinutes) {
      if (!isDue(reminderDueAt(release.startsAt, offset), now)) continue;
      await sendWave(release, reminderTrigger(offset), `${offset}:${release.startsAt.getTime()}`, now);
    }
  }

  // Only a release that really has units to buy is announced as live.
  const opened = await prisma.release.findMany({
    where: {
      ...publishedAndShown,
      slug: { not: null },
      startsAt: { lte: now, gte: minutesAgo(now, MESSAGE_SCHEDULE_GRACE_MINUTES) },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      allocations: { some: { available: { gt: 0 } } },
    },
    select: releaseSelect,
    orderBy: { startsAt: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });
  for (const release of opened) {
    await sendWave(release, "DROP_LIVE", String(release.startsAt.getTime()), now);
  }
}

/* ---------- test emails ---------- */

export async function sendReleaseTestEmails(releaseId: string, user: SessionUser): Promise<ReleaseTestEmailsResult> {
  const release = await prisma.release.findUnique({ where: { id: releaseId }, select: releaseSelect });
  if (!release) throw releaseNotFound();

  const [links, confirmUrl] = await Promise.all([
    releaseLinks(release, RELEASE_TEST_ENTRY_ID),
    waitlistConfirmUrl(RELEASE_TEST_ENTRY_ID),
  ]);
  const opensAt = formatStoreDateTime(release.startsAt.toISOString());
  const messages = [
    waitlistConfirmMessage({ ...links, confirmUrl }),
    waitlistWelcomeMessage({ ...links, opensAt, started: release.startsAt.getTime() <= Date.now() }),
    ...release.reminderOffsetsMinutes.map((offset) =>
      sequenceEmail(reminderTrigger(offset), links, {
        timeLeft: timeUntilLabel(reminderDueAt(release.startsAt, offset), release.startsAt),
        opensAt,
      }),
    ),
    dropLiveMessage(links),
  ];

  const result: ReleaseTestEmailsResult = { recipient: user.email, sent: 0, logged: 0, failed: 0 };
  for (const message of messages) {
    try {
      const outcome = await sendEmail({
        ...message,
        to: user.email,
        subject: `${RELEASE_TEST_EMAIL_SUBJECT_PREFIX}${message.subject}`,
      });
      if (outcome === "SENT") result.sent += 1;
      else result.logged += 1;
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      console.error(`release test email "${message.subject}" failed`, error);
      result.failed += 1;
    }
  }
  return result;
}

/* ---------- campaigns ---------- */

const campaignSelect = {
  id: true,
  name: true,
  content: true,
  ctaLabel: true,
  ctaHref: true,
  release: { select: { slug: true, title: true } },
} satisfies Prisma.CampaignSelect;

const CTA_DEFAULT_LABEL = "See the campaign";

async function campaignUrl(ctaHref: string | null, releaseUrl: string): Promise<string> {
  if (!ctaHref) return releaseUrl;
  return ctaHref.startsWith("/") ? appUrl(ctaHref) : ctaHref;
}

/**
 * The message of each live campaign that is linked to a release, to that
 * release's confirmed, opted in waitlist. A campaign with no release has no
 * audience that has asked to hear from us, so it sends nothing.
 */
export async function sweepCampaignMessages(now: Date): Promise<void> {
  const campaigns = await prisma.campaign.findMany({
    where: { state: "PUBLISHED", startsAt: { lte: now }, endsAt: { gt: now }, releaseId: { not: null } },
    select: { ...campaignSelect, releaseId: true },
    orderBy: { startsAt: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });

  for (const campaign of campaigns) {
    if (!campaign.releaseId || !campaign.release) continue;
    const releaseId = campaign.releaseId;
    const prefix = `${dedupeKey("CAMPAIGN_MESSAGE", campaign.id)}:`;
    const handled = await settledRecipients("CAMPAIGN_MESSAGE", campaign.id, prefix);
    const entries = await prisma.waitlistEntry.findMany({
      where: { releaseId, ...confirmed, emailOptIn: true, email: { notIn: handled } },
      select: entrySelect,
      orderBy: { id: "asc" },
      take: MESSAGE_SWEEP_BATCH,
    });

    for (const entry of entries) {
      await dispatchEmail({
        trigger: "CAMPAIGN_MESSAGE",
        recipient: entry.email,
        userId: entry.userId,
        refId: campaign.id,
        refLabel: `Campaign ${campaign.name}`,
        dedupeKey: `${prefix}${entry.id}`,
        build: async () => {
          const links = await releaseLinks(campaign.release!, entry.id);
          return campaignMessage({
            ...links,
            url: await campaignUrl(campaign.ctaHref, links.url),
            campaign: campaign.name,
            content: campaign.content,
            ctaLabel: campaign.ctaLabel || CTA_DEFAULT_LABEL,
          });
        },
      });
    }
  }
}
