"use client";

import { cn } from "@/lib/utils";

export interface ProgressStep {
  id: string;
  label: string;
}

interface Props {
  steps: ProgressStep[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function CheckoutProgress({ steps, activeIndex, onSelect }: Props) {
  const active = steps[activeIndex];

  return (
    <nav aria-label="Checkout progress" className="w-full">
      <div className="flex items-center justify-between gap-4 sm:hidden">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          Step {activeIndex + 1} of {steps.length}
        </p>
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-accent">
          {active?.label}
        </p>
      </div>

      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          const number = String(index + 1).padStart(2, "0");
          const pillClass = cn(
            "flex w-full min-w-0 items-center gap-2.5 rounded-full border px-3 py-2 text-left",
            "transition-[border-color,background-color,color] duration-(--duration-fast)",
            isActive && "border-accent/40 bg-accent/10 text-accent",
            isDone && "cursor-pointer border-line text-ink-secondary hover:border-line-strong hover:text-ink",
            !isActive && !isDone && "border-line text-ink-muted",
          );
          const content = (
            <>
              <span
                aria-hidden
                className={cn(
                  "font-mono text-[0.6875rem] uppercase tabular-nums tracking-[0.2em]",
                  isActive ? "text-accent" : isDone ? "text-ink-secondary" : "text-ink-faint",
                )}
              >
                {number}
              </span>
              <span className="truncate text-[0.8125rem] font-medium tracking-tight">
                {step.label}
              </span>
            </>
          );
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              {isDone ? (
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-label={`Edit step ${index + 1}, ${step.label}`}
                  className={pillClass}
                >
                  {content}
                </button>
              ) : (
                <div aria-current={isActive ? "step" : undefined} className={pillClass}>
                  {content}
                </div>
              )}
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
