"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  getSetupBundle,
  productHref,
  savingAmount,
  type Product,
} from "@/lib/products";
import { productHrefForCategory } from "@/lib/route-map";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { cn, formatPrice } from "@/lib/utils";

const rise = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/**
 * Complete your setup — the cross-sell, written as a sentence rather
 * than a shelf.
 *
 * An anchor device on the left and the things that go with it on the
 * right, joined by a `+` rail. The relationship is the point: four
 * unrelated products under a "you may also like" heading is the shape
 * every store uses and the reason nobody reads it.
 *
 * The pairings are curated in `getSetupBundle()`, not derived. "Customers
 * also bought" needs order history, and inventing that correlation would
 * be a claim about behaviour that never happened.
 */
export function Setup() {
  const bundle = getSetupBundle();
  if (!bundle) return null;

  const { anchor, additions } = bundle;
  const bundleTotal = additions.reduce((sum, p) => sum + p.price, 0);
  const bundleSaving = additions.reduce((sum, p) => sum + savingAmount(p), 0);

  return (
    <section
      aria-labelledby="setup-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section-sm) pb-14 lg:pb-16"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className="grid gap-6 lg:grid-cols-12 lg:items-end"
        >
          <motion.h2
            variants={rise}
            id="setup-heading"
            className="font-sans text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.05] tracking-[-0.035em] text-ink lg:col-span-6"
          >
            Complete your setup.
          </motion.h2>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:col-start-8 lg:justify-self-end"
          >
            Everything that works better together — certified to the same
            standard, covered by the same warranty.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mt-12 grid overflow-hidden rounded-2xl border border-line bg-surface lg:mt-16 lg:grid-cols-12"
        >
          {/* ---------- The anchor ---------- */}
          <div className="flex items-center gap-6 border-b border-line bg-void p-6 sm:p-8 lg:col-span-4 lg:flex-col lg:items-stretch lg:justify-center lg:border-b-0 lg:border-r">
            <div className="relative size-24 shrink-0 lg:aspect-square lg:size-auto lg:w-full">
              <Image
                src={anchor.image.url}
                alt={anchor.image.alt}
                fill
                sizes="(max-width: 1024px) 96px, 20rem"
                className="object-contain lg:p-8"
              />
            </div>
            <div className="min-w-0 lg:mt-6">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink-muted">
                Start with
              </p>
              <p className="mt-2 truncate text-[1.0625rem] font-medium text-ink">
                {anchor.name}
              </p>
              <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
                {anchor.variant}
              </p>
            </div>
          </div>

          {/* ---------- What goes with it ---------- */}
          <div className="lg:col-span-8">
            <ul>
              {additions.map((product, i) => (
                <SetupRow key={product.id} product={product} first={i === 0} />
              ))}
            </ul>

            {/* Bundle maths, derived from the rows above it so the two can
                never disagree. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line p-6 sm:px-8">
              <p className="text-[0.8125rem] text-ink-secondary">
                <span className="font-medium text-ink">
                  Add all three ·{" "}
                  {formatPrice(bundleTotal, anchor.currency, anchor.locale)}
                </span>{" "}
                — saving{" "}
                {formatPrice(bundleSaving, anchor.currency, anchor.locale)} on
                new.
              </p>

              <Link
                href={productHrefForCategory("accessories")}
                className="group/all inline-flex items-center gap-2 text-[0.8125rem] font-medium text-ink transition-colors duration-(--duration-fast) hover:text-accent"
              >
                Browse accessories
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3 transition-transform duration-(--duration-fast) ease-(--ease-out-quart) group-hover/all:translate-x-1"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** One companion product. The `+` is what makes the row read as an addition. */
function SetupRow({ product, first }: { product: Product; first: boolean }) {
  return (
    <li className={cn(!first && "border-t border-line")}>
      <div className="group/row flex items-center gap-4 p-6 sm:gap-5 sm:px-8">
        <span
          aria-hidden
          className="hidden shrink-0 font-mono text-sm text-ink-faint sm:block"
        >
          +
        </span>

        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-void">
          <Image
            src={product.image.url}
            alt=""
            fill
            sizes="56px"
            className="object-contain p-1.5"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-medium text-ink">
            {product.name}
          </p>
          <p className="mt-0.5 truncate text-[0.8125rem] text-ink-secondary">
            {product.variant}
          </p>
        </div>

        <p className="shrink-0 text-[0.9375rem] font-medium tabular-nums text-ink">
          {formatPrice(product.price, product.currency, product.locale)}
        </p>

        {/* View, not Add to cart. There is no cart write path yet, and a
            button that silently does nothing is worse than a link that
            goes where it says. */}
        <Link
          href={productHref(product)}
          className={cn(
            "shrink-0 rounded-full border border-line px-4 py-2",
            "text-[0.75rem] font-medium text-ink",
            "transition-colors duration-(--duration-fast) hover:border-ink hover:bg-ink hover:text-surface",
          )}
        >
          View
          <span className="sr-only"> {product.name}</span>
        </Link>
      </div>
    </li>
  );
}
