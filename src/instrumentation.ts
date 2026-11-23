import { RELEASE_SWEEP_INTERVAL_MS } from "@/lib/constants";

/**
 * Runs once when the server starts. It starts the timer that sends the timed
 * marketing messages (reminders, drop live, abandoned checkout, warranty
 * notices). It ticks every `RELEASE_SWEEP_INTERVAL_MS`; the scheduler runs the
 * release messages on every tick and the rest once per
 * `MESSAGE_SWEEP_INTERVAL_MS`. Every send is recorded with a unique key, so a
 * second server or a restart can never send a message twice. See
 * docs/MESSAGING.md.
 */
const TIMER_FLAG = "__rewireMessageTimer";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const scope = globalThis as typeof globalThis & { [TIMER_FLAG]?: boolean };
  if (scope[TIMER_FLAG]) return;
  scope[TIMER_FLAG] = true;

  const { runScheduledMessages } = await import("@/services/message-scheduler.service");
  const timer = setInterval(() => {
    runScheduledMessages().catch((error: unknown) => console.error("scheduled messages failed", error));
  }, RELEASE_SWEEP_INTERVAL_MS);
  timer.unref();
}
