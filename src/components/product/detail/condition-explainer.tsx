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
    <div>
      {/* ---------- Active state header ----------
          The wrapping card is gone. On the previous pass the outer
          rounded-2xl frame turned the block into a card-inside-a-card
          when the section it lives in already carries its own eyebrow
          above; the visual weight fought the four-column table that
          this component exists to render.
          The header now sits directly on the page ground as an
          editorial masthead: "On this listing" as a small mono label,
          the state as a display-scale line with the grade beside it
          picked out in the accent, the plain-language definition
          below, and the general reassurance to the right rather than
          fighting for the same column. */}
      {activeCondition && (
        <div className="grid gap-6 border-b border-line pb-10 md:pb-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="eyebrow text-ink-muted">On this listing</p>
            <p className="mt-4 font-sans text-[clamp(1.75rem,3vw,2.5rem)] font-light leading-[1.05] tracking-[-0.025em] text-ink">
              {activeCondition.label}
              {grade && (
                <>
                  <span aria-hidden className="mx-3 text-ink-faint">
                    ·
                  </span>
                  <span className="text-accent">{grade}</span>
                </>
              )}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
              {activeCondition.detail}
            </p>
          </div>
          <p className="max-w-xs text-[0.9375rem] leading-relaxed text-ink-muted lg:col-span-4 lg:col-start-9 lg:justify-self-end lg:pt-8">
            Every state we sell is defined here, so you always know what
            arrives in the box.
          </p>
        </div>
      )}

      {/* ---------- Comparison row ----------
          Four boxes now, one per state. The active box is lifted a step
          in surface luminance (`bg-surface-3` on the elevated ground),
          carries a copper hairline instead of the neutral one, and
          takes an inset accent bar along the top — three quiet cues
          that stack rather than shouting. The others sit on the card
          ground with a plain line-strong hairline and muted type, so
          the row reads as a comparison spread where one column is
          obviously "yours" without turning the other three into
          greyed-out ghosts. */}
      <dl
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6",
          activeCondition && "mt-10 md:mt-14",
        )}
      >
        {CONDITIONS.map((condition) => {
          const isActive = condition.key === active;
          return (
            <div
              key={condition.key}
              className={cn(
                "relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-6 transition-colors duration-(--duration-fast)",
                isActive
                  ? "border-accent/70 bg-surface-3"
                  : "border-line-strong bg-surface",
              )}
            >
              {/* Inset accent bar — one pixel tall, spans the full top
                  edge of the active card, sits just inside the border so
                  it reads as a mark on the card rather than as part of
                  the frame. Suppressed on the inactive cards; combined
                  with the bg lift and the accent border it makes the
                  active state unambiguous at a glance. */}
              {isActive && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-accent"
                />
              )}

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
