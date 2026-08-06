"use client";

import { cn, pad } from "@/lib/utils";
import { useCountdown } from "@/hooks/use-countdown";

interface CountdownProps {
  /** Target date (ISO string or Date). */
  target: Date | string;
  /** Compact renders inline (cards); default renders as a stat row (drop pages). */
  compact?: boolean;
  /** Called content for screen readers, e.g. "Drop ends in". */
  label?: string;
  className?: string;
  onComplete?: () => void;
}

/**
 * Countdown — the heartbeat of the drop model.
 * Mono digits with tabular figures so nothing jitters as numbers tick.
 */
export function Countdown({
  target,
  compact = false,
  label = "Time remaining",
  className,
}: CountdownProps) {
  const { days, hours, minutes, seconds, isComplete } = useCountdown(target);

  const segments = [
    { value: days, unit: "days" },
    { value: hours, unit: "hrs" },
    { value: minutes, unit: "min" },
    { value: seconds, unit: "sec" },
  ];

  if (compact) {
    return (
      <time
        className={cn(
          "font-mono text-sm tabular-nums tracking-wider text-ink-secondary",
          isComplete && "text-ink-muted",
          className,
        )}
        aria-label={label}
      >
        {isComplete
          ? "Ended"
          : `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </time>
    );
  }

  return (
    <div className={cn("flex items-start gap-6 md:gap-10", className)} aria-label={label}>
      {segments.map(({ value, unit }, i) => (
        <div key={unit} className="flex items-start gap-6 md:gap-10">
          {i > 0 && (
            <span
              aria-hidden
              className="font-mono text-3xl md:text-5xl text-ink-faint leading-none pt-0.5"
            >
              :
            </span>
          )}
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-4xl md:text-6xl tabular-nums leading-none tracking-tight">
              {pad(value)}
            </span>
            <span className="eyebrow">{unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
