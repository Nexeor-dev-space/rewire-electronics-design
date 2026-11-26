import {
  COUNTDOWN_MIN_OFFSET_MINUTES,
  MESSAGE_MAX_ATTEMPTS,
  MESSAGE_SCHEDULE_GRACE_MINUTES,
  MESSAGE_SWEEP_INTERVAL_MS,
  MS_PER_MINUTE,
  RELEASE_SWEEP_INTERVAL_MS,
} from "@/lib/constants";

/* ---------- triggers, channels, statuses ----------
   Mirror the enums in prisma/schema/messaging.prisma. */

export const MESSAGE_CHANNELS = ["EMAIL", "WHATSAPP"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_STATUSES = ["SENDING", "SENT", "FAILED", "SKIPPED"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  SENDING: "Sending",
  SENT: "Sent",
  FAILED: "Failed",
  SKIPPED: "Skipped",
};

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
};

export const MESSAGE_TRIGGER_LABELS = {
  WAITLIST_WELCOME: "Waitlist welcome",
  CAMPAIGN_MESSAGE: "Campaign message",
  COUNTDOWN_UPDATE: "Countdown update",
  DROP_REMINDER: "Drop reminder",
  DROP_LIVE: "Drop live",
  BACK_IN_STOCK: "Back in stock",
  ABANDONED_CHECKOUT: "Abandoned checkout",
  EMAIL_VERIFICATION: "Email verification",
  ACCOUNT_REACTIVATION: "Account reactivation",
  ORDER_CONFIRMATION: "Order confirmation",
  ORDER_PAYMENT_RECEIVED: "Payment received",
  ORDER_DISPATCHED: "Dispatch update",
  DELIVERY_ATTEMPT_FAILED: "Delivery attempt failed",
  ORDER_DELIVERED: "Delivery confirmation",
  ORDER_CANCELLED: "Order cancelled",
  DEVICE_RECORD: "Device record",
  REVIEW_REQUEST: "Review request",
  ADDON_ENTITLEMENT_SUMMARY: "Add-on entitlement summary",
  ENTITLEMENT_REMINDER: "Entitlement reminder",
  WARRANTY_EXPIRY_NOTICE: "Warranty expiry notice",
  WARRANTY_CLAIM_STATUS: "Warranty claim status",
  WARRANTY_FOLLOW_UP: "Warranty follow-up",
  RETURN_UPDATE: "Return update",
} as const;

export type MessageTrigger = keyof typeof MESSAGE_TRIGGER_LABELS;
export const MESSAGE_TRIGGERS = Object.keys(MESSAGE_TRIGGER_LABELS) as [MessageTrigger, ...MessageTrigger[]];

/** The only messages that may go over WhatsApp: the release sequence. */
export const WHATSAPP_TRIGGERS = ["COUNTDOWN_UPDATE", "DROP_REMINDER", "DROP_LIVE"] as const satisfies readonly MessageTrigger[];

export function whatsappAllowed(trigger: MessageTrigger): boolean {
  return (WHATSAPP_TRIGGERS as readonly string[]).includes(trigger);
}

/* ---------- skip reasons ---------- */

export const SKIP_REASONS = {
  whatsappNotAllowed: "WhatsApp is only used for countdown, drop reminder and drop live messages.",
  noWhatsappOptIn: "The customer has not opted in to WhatsApp.",
  noPhone: "No phone number on record.",
  noEmailOptIn: "The customer has not opted in to emails.",
  whatsappNotConfigured: "WhatsApp isn't set up on this server.",
} as const;

/* ---------- release sequence ---------- */

export type ReleaseMessageTrigger = "COUNTDOWN_UPDATE" | "DROP_REMINDER";

/** Long lead times are countdown updates; short ones are drop reminders. */
export function reminderTrigger(offsetMinutes: number): ReleaseMessageTrigger {
  return offsetMinutes >= COUNTDOWN_MIN_OFFSET_MINUTES ? "COUNTDOWN_UPDATE" : "DROP_REMINDER";
}

/**
 * Whether a timed message is due: its moment has passed, but not by more than
 * the grace, so a sweep that was down never sends a "1 hour to go" at the opening.
 */
export function isDue(dueAt: Date, now: Date): boolean {
  const lateMs = now.getTime() - dueAt.getTime();
  return lateMs >= 0 && lateMs <= MESSAGE_SCHEDULE_GRACE_MINUTES * MS_PER_MINUTE;
}

/** The moment a release's reminder with this offset is due. */
export function reminderDueAt(startsAt: Date, offsetMinutes: number): Date {
  return new Date(startsAt.getTime() - offsetMinutes * MS_PER_MINUTE);
}

/* ---------- the timer ---------- */

export const SLOW_SWEEP_EVERY_TICKS = Math.max(1, Math.round(MESSAGE_SWEEP_INTERVAL_MS / RELEASE_SWEEP_INTERVAL_MS));

export function sweepsDueOnTick<Sweep extends { everyTick?: boolean }>(sweeps: readonly Sweep[], tick: number): Sweep[] {
  const slowTick = tick % SLOW_SWEEP_EVERY_TICKS === 0;
  return sweeps.filter((sweep) => sweep.everyTick || slowTick);
}

/* ---------- dedupe keys ---------- */

/** One key per event, so the same event never sends twice. */
export function dedupeKey(...parts: (string | number)[]): string {
  return parts.join(":");
}

/** A failed send may be tried again until it has used its attempts. */
export function canRetry(attempts: number): boolean {
  return attempts < MESSAGE_MAX_ATTEMPTS;
}

/** "in 2 days", "in 1 hour", "in 30 minutes": how far off an opening is. */
export function timeUntilLabel(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / MS_PER_MINUTE));
  if (minutes >= 24 * 60) return plural(Math.round(minutes / (24 * 60)), "day");
  if (minutes >= 60) return plural(Math.round(minutes / 60), "hour");
  return plural(Math.max(1, minutes), "minute");
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}
