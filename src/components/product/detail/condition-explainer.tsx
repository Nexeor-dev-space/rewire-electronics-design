import { cn } from "@/lib/utils";

/**
 * ConditionExplainer — the four states the storefront trades in, defined
 * once, in the same place. The active one is highlighted; the others stay
 * visible so a shopper can compare without leaving the page.
 *
 * Grade sits beside the active condition when it applies (Refurbished only
 * carries A/B/C today). No prose beyond the one line each state deserves.
 */

const CONDITIONS = [
  {
    key: "refurbished",
    label: "Refurbished",
    detail: "Professionally inspected and tested to ensure reliable performance.",
  },
  {
    key: "pre-owned",
    label: "Pre-Owned",
    detail: "Previously owned and tested for functionality.",
  },
  {
    key: "just-opened",
    label: "Just Opened",
    detail:
      "Packaging has been opened, with little or no previous use depending on the product.",
  },
  {
    key: "new",
    label: "New",
    detail: "Brand-new and unused.",
  },
] as const;

type ConditionKey = (typeof CONDITIONS)[number]["key"];

interface Props {
  /**
   * The condition being highlighted. Omit on surfaces that describe the
   * catalogue at large (e.g. the About page) rather than a single
   * listing — the "On this listing" header disappears and no card is
   * marked active, so the four states read as equal peers.
   */
  active?: ConditionKey;
  grade?: string;
}

export function ConditionExplainer({ active, grade }: Props) {
  const activeCondition = active
    ? CONDITIONS.find((c) => c.key === active)
    : undefined;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-10">
      {activeCondition && (
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="eyebrow">On this listing</p>
            <p className="mt-2 text-display-sm font-light text-ink">
              {activeCondition.label}
              {grade && (
                <span className="text-ink-muted">
                  <span aria-hidden> · </span>
                  <span className="text-ink">{grade}</span>
                </span>
              )}
            </p>
          </div>
          <p className="max-w-xs text-[0.9375rem] text-ink-secondary">
            Every state we sell is defined here, so you always know what
            arrives in the box.
          </p>
        </div>
      )}

      <dl
        className={cn(
          "grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4",
          activeCondition && "mt-10",
        )}
      >
        {CONDITIONS.map((condition) => {
          const isActive = condition.key === active;
          return (
            <div
              key={condition.key}
              className={cn(
                "relative flex flex-col gap-3 bg-surface p-6",
                isActive && "bg-surface-2",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    isActive ? "bg-accent" : "bg-ink-faint",
                  )}
                />
                <dt
                  className={cn(
                    "text-[0.9375rem] font-medium tracking-tight",
                    isActive ? "text-ink" : "text-ink-secondary",
                  )}
                >
                  {condition.label}
                </dt>
              </div>
              <dd
                className={cn(
                  "text-[0.8125rem] leading-relaxed",
                  isActive ? "text-ink-secondary" : "text-ink-muted",
                )}
              >
                {condition.detail}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
