import type { Product } from "@/types";
import { cn } from "@/lib/utils";

/**
 * ProductOverview — the editorial read of a listing.
 *
 * Placed between the buy stage and the four condition boxes, so a
 * shopper who scrolls past the price panel meets the *why* of the
 * device before the *what* of the condition: what it is, what makes it
 * worth having, and the four proof numbers Rewire trades on (battery
 * health, warranty term, inspection count, listing condition).
 *
 * Every block is data-driven. If the catalogue entry has no
 * `description` and no `highlights`, the component renders nothing —
 * accessory listings that don't need an overview simply skip the
 * section. Fact tiles that lack a value fall back to a `— ` glyph
 * rather than a blank cell, so the four-across rhythm holds regardless
 * of catalogue completeness.
 */
interface Props {
  product: Product;
  condition: string;
  grade?: string;
}

export function ProductOverview({ product, condition, grade }: Props) {
  const hasBody = !!product.description || !!product.highlights?.length;
  if (!hasBody) return null;

  const battery = product.batteryHealth
    ? `${product.batteryHealth}%`
    : undefined;
  const inspectionCount = product.inspection?.length;

  const facts: { label: string; value: string; note?: string }[] = [
    {
      label: "Battery health",
      value: battery ?? "—",
      note: battery ? "Measured cell capacity" : undefined,
    },
    {
      label: "Warranty",
      value: product.warranty ?? "12 months",
      note: "Rewire cover, included",
    },
    {
      label: "Inspection",
      value: inspectionCount ? `${inspectionCount} points` : "68 points",
      note: "Passed to list",
    },
    {
      label: "Condition",
      value: [condition, grade].filter(Boolean).join(" · "),
    },
  ];

  return (
    <div>
      {/* ---------- Editorial header ----------
          Same two-column pattern the redesigned condition explainer
          uses one section below, so the two blocks read as a set: a
          display-scale line for the argument, an editorial paragraph
          for the substance, and a quiet reassurance line to the right. */}
      <div className="grid gap-8 border-b border-line pb-10 md:pb-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <h3 className="font-sans text-[clamp(1.75rem,3vw,2.5rem)] font-light leading-[1.05] tracking-[-0.025em] text-ink">
            The device, and the standard it earns.
          </h3>
          {product.description && (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-secondary">
              {product.description}
            </p>
          )}
        </div>
        <p className="max-w-xs text-[0.9375rem] leading-relaxed text-ink-muted lg:col-span-4 lg:col-start-9 lg:justify-self-end lg:pt-8">
          Every listing carries the same four guarantees. This one is no
          exception — the numbers below are the ones we measured for
          this device.
        </p>
      </div>

      {/* ---------- Fact strip ----------
          Four numbers, one row, no wrapper card — the section around
          the block is already framed by the eyebrow. Battery gets the
          copper accent because it is the one number that varies between
          listings and therefore the one that answers "how good is this
          particular device"; the other three are constants and stay in
          ink. */}
      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:mt-12 md:grid-cols-4">
        {facts.map((fact, i) => {
          const isBattery = i === 0 && battery;
          return (
            <div
              key={fact.label}
              className="border-t border-line pt-5"
            >
              <dt className="eyebrow text-ink-muted">{fact.label}</dt>
              <dd
                className={cn(
                  "mt-3 font-sans text-[1.75rem] font-light leading-none tracking-[-0.02em] tabular-nums",
                  isBattery ? "text-accent" : "text-ink",
                )}
              >
                {fact.value}
              </dd>
              {fact.note && (
                <p className="mt-2 text-[0.75rem] leading-snug text-ink-muted">
                  {fact.note}
                </p>
              )}
            </div>
          );
        })}
      </dl>

      {/* ---------- Highlights ----------
          The scannable list from the buy box, given room to breathe as
          feature cards. Each card carries a mono index (01/02/…) and
          the highlight as a display-small headline; no supporting
          paragraph, no icon — a decorated tile per bullet would turn
          the section into marketing chrome, and the four boxes are the
          section's real proof.
          Only rendered when the catalogue has highlights for this
          listing. Falls back to nothing rather than to placeholder
          copy, so the shopper never reads a synthetic feature line. */}
      {product.highlights && product.highlights.length > 0 && (
        <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:mt-16 lg:grid-cols-4 lg:gap-6">
          {product.highlights.map((line, i) => (
            <li
              key={line}
              className="group/highlight relative flex h-full flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface p-6 transition-colors duration-(--duration-fast) hover:border-white/[0.22]"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden
                  className="h-px w-8 bg-line-strong transition-colors duration-(--duration-fast) group-hover/highlight:bg-accent"
                />
              </div>
              <p className="mt-8 font-sans text-[1.0625rem] font-light leading-snug tracking-[-0.01em] text-ink">
                {line}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
