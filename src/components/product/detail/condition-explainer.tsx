import { conditions as CONDITIONS, type Condition } from "@/lib/shop";
import { cn } from "@/lib/utils";

/**
 * ConditionExplainer — the four states the storefront trades in. The
 * active one is highlighted; the others stay visible so a shopper can
 * compare without leaving the page.
 *
 * The definitions are **not** written here. They come from
 * `lib/shop.ts`, which is the one place a condition is defined and the
 * same list the filter panel and the card badges read. This component
 * used to keep its own copy, and that copy had drifted: it named a
 * fifth state, "Just Opened", that the catalogue calls Open Box, so the
 * product page and the filter beside it disagreed about what a shopper
 * was buying.
 *
 * Grade sits beside the active condition when it applies (Refurbished
 * and Pre-Owned only — see `gradeApplies`). No prose beyond the one
 * line each state deserves.
 */

interface Props {
  /**
   * The condition being highlighted. Omit on surfaces that describe the
   * catalogue at large (e.g. the About page) rather than a single
   * listing — the "On this listing" header disappears and no card is
   * marked active, so the four states read as equal peers.
   */
  active?: Condition;
  grade?: string;
}

export function ConditionExplainer({ active, grade }: Props) {
  const activeCondition = active
    ? CONDITIONS.find((c) => c.value === active)
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
              {activeCondition.note}
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
          const isActive = condition.value === active;
          return (
            <div
              key={condition.value}
              className={cn(
                "relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-6 transition-colors duration-(--duration-fast)",
                isActive
                  ? "border-accent/70 bg-surface-3"
                  : "border-line-strong bg-surface",
              )}
            >
              {/* The inset accent top-bar was removed: the card's own
                  accent border already outlines the whole edge, so an
                  extra 1px stripe on top read as a doubled hairline —
                  a graphical stutter, not a status cue. The active
                  card is now marked by the accent border + `surface-3`
                  ground + the accent dot and label alone. */}

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
                {condition.note}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
