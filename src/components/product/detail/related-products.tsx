import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { AVAILABILITY_LABELS } from "@/types";
import { cn, formatPrice, savingsPercent } from "@/lib/utils";

/**
 * RelatedProducts — a small rail of the same-category items, or the same
 * brand from another shelf when the category is thin. Sold-out is filtered
 * upstream in `getRelatedProducts` so every card here is a card that can
 * be acted on.
 */
export function RelatedProducts({ items }: { items: Product[] }) {
  if (!items.length) return null;
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((product) => (
        <li key={product.slug}>
          <RelatedCard product={product} />
        </li>
      ))}
    </ul>
  );
}

function RelatedCard({ product }: { product: Product }) {
  const image = product.images[0];
  const saving =
    product.originalPrice != null
      ? savingsPercent(product.price, product.originalPrice)
      : 0;
  const availability = product.availability ?? "in-stock";
  const low = availability === "low-stock";
  const soldOut = availability === "sold-out";

  return (
    <article className="group/card relative flex h-full flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.04] bg-plate">
        {image && (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 78vw, (max-width: 1024px) 45vw, 23vw"
            className={cn(
              "[mix-blend-mode:multiply] transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
              "group-hover/card:scale-[1.04]",
              image.fit === "cover" ? "object-cover" : "object-contain p-8",
              soldOut && "opacity-45 grayscale",
            )}
          />
        )}

        {(low || soldOut) && (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-1",
              "bg-surface/90 font-mono text-[0.5625rem] uppercase tracking-[0.16em] backdrop-blur-sm",
              soldOut ? "text-ink-muted" : "text-urgent",
            )}
          >
            {AVAILABILITY_LABELS[availability]}
          </span>
        )}

        {saving > 0 && !soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-ink px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-surface">
            {saving}% off
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
          {product.brand}
        </p>
        <h3 className="mt-1 text-[1.0625rem] font-medium leading-tight tracking-[-0.015em] text-ink">
          <Link
            href={`/product/${product.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-[0.8125rem] text-ink-secondary">
          {product.variant}
        </p>

        <p className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-[1.0625rem] font-medium tabular-nums text-ink">
            {formatPrice(product.price, product.currency, product.locale)}
          </span>
          {product.originalPrice != null && product.originalPrice > product.price && (
            <s className="font-mono text-[0.75rem] tabular-nums text-ink-muted">
              {formatPrice(
                product.originalPrice,
                product.currency,
                product.locale,
              )}
            </s>
          )}
        </p>
      </div>
    </article>
  );
}
