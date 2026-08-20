"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Product } from "@/types";
import { CONDITION_LABELS } from "@/types";
import { cn, formatPrice, savingsPercent } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/ui/countdown";

interface ProductCardProps {
  product: Product;
  /** Deferred images below the fold should keep the default lazy loading. */
  priority?: boolean;
  className?: string;
}

/**
 * ProductCard — a floating artifact, not a shop tile.
 * The device sits on a dark radial stage; the card lifts and the
 * product eases forward on hover. Price is set in the mono voice.
 */
export function ProductCard({ product, priority, className }: ProductCardProps) {
  const image = product.images[0];
  const savings = product.originalPrice
    ? savingsPercent(product.price, product.originalPrice)
    : 0;
  const dropIsLive = product.drop?.status === "live";

  return (
    <motion.article
      className={cn("group relative", className)}
      whileHover="hover"
      initial="rest"
      animate="rest"
    >
      <Link
        href={`/product/${product.slug}`}
        className="block outline-none"
        aria-label={`${product.name}, ${product.variant}, ${formatPrice(product.price, product.currency)}`}
      >
        {/* Stage */}
        <motion.div
          className={cn(
            "relative aspect-4/5 overflow-hidden rounded-xl",
            "surface-gradient edge-light border border-line",
            "transition-[border-color] duration-(--duration-base) ease-(--ease-out-expo)",
            "group-hover:border-line-strong",
          )}
          variants={{
            rest: { y: 0 },
            hover: { y: -6 },
          }}
          transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        >
          {/* Status chrome */}
          <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between">
            <Badge variant={product.soldOut ? "soldOut" : dropIsLive ? "live" : "outline"}>
              {product.soldOut ? "Sold out" : dropIsLive ? "Live" : product.brand}
            </Badge>
            {product.edition && (
              <Badge variant="accent">
                {product.edition.number
                  ? `No. ${product.edition.number} / ${product.edition.of}`
                  : `Edition of ${product.edition.of}`}
              </Badge>
            )}
          </div>

          {/* Product image floats above its stage */}
          {image && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-10"
              variants={{
                rest: { scale: 1, y: 0 },
                hover: { scale: 1.04, y: -4 },
              }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
            >
              <Image
                src={image.url}
                alt={image.alt}
                width={image.width}
                height={image.height}
                priority={priority}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className={cn(
                  "h-full w-full object-contain drop-shadow-[0_24px_48px_rgb(20_20_25/0.25)]",
                  product.soldOut && "opacity-50 saturate-50",
                )}
              />
            </motion.div>
          )}

          {/* Live drop countdown, pinned to the stage floor */}
          {dropIsLive && product.drop?.endsAt && !product.soldOut && (
            <div className="absolute inset-x-4 bottom-4 z-10 flex justify-end">
              <span className="glass rounded-full px-3.5 py-2">
                <Countdown compact target={product.drop.endsAt} label="Drop ends in" />
              </span>
            </div>
          )}
        </motion.div>

        {/* Meta — editorial, outside the stage */}
        <div className="mt-5 flex items-start justify-between gap-4 px-1">
          <div className="min-w-0">
            <h3 className="text-base font-medium tracking-tight text-ink truncate">
              {product.name}
            </h3>
            <p className="mt-1 text-sm text-ink-muted truncate">
              {product.variant} · {CONDITION_LABELS[product.condition]}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-sm tabular-nums text-ink">
              {formatPrice(product.price, product.currency)}
            </p>
            {product.originalPrice && savings > 0 && (
              <p className="mt-1 font-mono text-xs tabular-nums text-ink-muted">
                <s>{formatPrice(product.originalPrice, product.currency)}</s>{" "}
                <span className="text-accent">−{savings}%</span>
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
