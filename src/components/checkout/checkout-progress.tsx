"use client";

import { cn } from "@/lib/utils";

/**
 * CheckoutProgress — the four-step chapter marker.
 *
 * The whole checkout lives on one page, so this reads as a table of
 * contents rather than a wizard: every step is visible at once, and the
 * *active* pill highlights whichever section the reader has reached.
 * Numbers stay set in the mono voice; the connector between steps is a
 * hairline for calm, not a heavy divider.
 *
 * Desktop shows step name + number; below `sm` the row compacts to a
 * "Step X of 4" label plus the current step's name — the four-across
 * layout only survives when there is width to hold it.
 */

export interface ProgressStep {
  id: string;
  label: string;
}

interface Props {
  steps: ProgressStep[];
  activeId: string;
}

export function CheckoutProgress({ steps, activeId }: Props) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeId),
  );
  const active = steps[activeIndex];

  return (
    <nav aria-label="Checkout progress" className="w-full">
      {/* Compact — phones */}
      <div className="flex items-center justify-between gap-4 sm:hidden">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          Step {activeIndex + 1} of {steps.length}
        </p>
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-accent">
          {active?.label}
        </p>
      </div>

      {/* Full — sm and up */}
      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2.5 rounded-full border px-3 py-2",
                  "transition-[border-color,background-color,color] duration-(--duration-fast)",
                  isActive && "border-accent/40 bg-accent/10 text-accent",
                  !isActive && isPast && "border-line text-ink-secondary",
                  !isActive && !isPast && "border-line text-ink-muted",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "font-mono text-[0.6875rem] uppercase tabular-nums tracking-[0.2em]",
                    isActive
                      ? "text-accent"
                      : isPast
                        ? "text-ink-secondary"
                        : "text-ink-faint",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "truncate text-[0.8125rem] font-medium tracking-tight",
                    !isActive && "text-inherit",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span aria-hidden className="h-px w-6 shrink-0 bg-line" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
