import { cn } from "@/lib/utils";

type Tone = "live" | "warn" | "muted" | "danger" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  live: "border-live/40 bg-live/10 text-live",
  warn: "border-warn/40 bg-warn/10 text-warn",
  muted: "border-line-strong bg-white/[0.03] text-ink-secondary",
  danger: "border-danger/40 bg-danger/10 text-danger",
  accent: "border-accent/40 bg-accent/10 text-accent",
};

/**
 * StatusPill — the small mono chip used for order and return states.
 *
 * Tone is decided at the call site (via `orderStatusTone` /
 * `returnStatusTone`) so pages can decide, and the pill stays a leaf.
 * Uppercase mono with generous tracking to match the site's editorial
 * label style, not a shouty ecommerce badge.
 */
export function StatusPill({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "font-mono text-[0.625rem] uppercase tracking-[0.18em]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1 rounded-full bg-current", tone === "live" && "animate-pulse-dot")}
      />
      {children}
    </span>
  );
}
