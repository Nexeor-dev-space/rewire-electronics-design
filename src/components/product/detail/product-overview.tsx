import type { Product } from "@/types";

/**
 * ProductOverview — the editorial read of a listing.
 *
 * Structure mirrors the noon.com PDP overview: a proper section title,
 * multi-paragraph descriptive body, then a HIGHLIGHTS eyebrow above a
 * plain bulleted list. Deliberately quieter than the previous card
 * treatment — the block reads as long-form product copy the way a
 * catalogue page should, not as marketing chrome. The four proof
 * numbers (battery, warranty, inspection, condition) have moved to the
 * Trust Blocks section further down, where they no longer fight the
 * description for attention.
 *
 * Every block is data-driven. If the catalogue entry has no
 * `description` and no `highlights`, the component renders nothing —
 * accessory listings that don't need an overview simply skip the
 * section.
 *
 * `description` is split on paragraph breaks (blank lines) so a
 * catalogue entry can supply a well-structured multi-paragraph write-up
 * the way noon's PDPs do. Single-paragraph entries render as one
 * paragraph and the split becomes a no-op.
 */
interface Props {
  product: Product;
}

export function ProductOverview({ product }: Props) {
  const hasBody = !!product.description || !!product.highlights?.length;
  if (!hasBody) return null;

  const paragraphs = product.description
    ? product.description
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div>
      {/* ---------- Title ----------
          Display-scale, plain — the noon reference uses a big "Product
          Overview" heading as the section title, and repeating that
          pattern here makes the block feel like a proper long-form
          section rather than a card of a card. */}
      <h2 className="font-sans text-[clamp(1.75rem,3vw,2.5rem)] font-light leading-[1.05] tracking-[-0.025em] text-ink">
        Product Overview
      </h2>

      {/* ---------- Body ----------
          Constrained to a comfortable reading measure (`max-w-3xl`).
          Multi-paragraph copy stacks with `space-y-4`; a single-paragraph
          description renders as one item and the gap does nothing. */}
      {paragraphs.length > 0 && (
        <div className="mt-6 max-w-3xl space-y-4">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-base leading-relaxed text-ink-secondary"
            >
              {p}
            </p>
          ))}
        </div>
      )}

      {/* ---------- Highlights ----------
          Plain bulleted list under an eyebrow, matching the noon
          reference. Copper accent dot instead of a disc bullet so the
          list carries the site's one accent quietly — the same colour
          the price uses one section up, tying the section to the buy
          box without borrowing its weight. */}
      {product.highlights && product.highlights.length > 0 && (
        <div className="mt-12 md:mt-14">
          <p className="eyebrow text-ink-muted">Highlights</p>
          <ul className="mt-5 max-w-3xl space-y-3.5">
            {product.highlights.map((line) => (
              <li key={line} className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-accent"
                />
                <span className="text-base leading-relaxed text-ink-secondary">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
