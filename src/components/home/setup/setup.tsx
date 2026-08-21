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
      className="relative overflow-hidden bg-surface-2 pt-(--spacing-section-sm) pb-14 lg:pb-16"
    >
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
          className="mt-12 grid overflow-hidden rounded-2xl border border-line bg-surface shadow-(--shadow-soft) lg:mt-16 lg:grid-cols-12"
        >
          {/* ---------- The anchor ----------
              Anchor sits on a warm cream plate — same treatment as the
              storefront cards — so the device reads instantly instead of
              disappearing into a dark panel. */}
          <div className="flex flex-col border-b border-line lg:col-span-5 lg:border-b-0 lg:border-r">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-plate lg:aspect-auto lg:flex-1">
              <Image
                src={anchor.image.url}
                alt={anchor.image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-contain p-8 [mix-blend-mode:multiply] sm:p-12"
              />
            </div>
            <div className="border-t border-line p-6 sm:p-8">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink-muted">
                Start with
              </p>
              <p className="mt-2 text-xl font-medium tracking-[-0.015em] text-ink sm:text-2xl">
                {anchor.name}
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                {anchor.variant}
              </p>
            </div>
          </div>

          {/* ---------- What goes with it ---------- */}
          <div className="flex flex-col lg:col-span-7">
            <ul className="flex-1">
              {additions.map((product, i) => (
                <SetupRow key={product.id} product={product} first={i === 0} />
              ))}
            </ul>

            {/* Bundle footer — two lines and a primary CTA. Total is the
                headline, saving is the reassurance, browse-more is the
                escape hatch for anyone the curation doesn't fit. */}
            <div className="border-t border-line bg-surface-2/50 p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div>
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink-muted">
                    Add all three
                  </p>
                  <p className="mt-2 font-mono text-3xl font-medium tabular-nums text-ink">
                    {formatPrice(bundleTotal, anchor.currency, anchor.locale)}
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] text-ink-secondary">
                    Saving{" "}
                    <span className="text-accent">
                      {formatPrice(
                        bundleSaving,
                        anchor.currency,
                        anchor.locale,
                      )}
                    </span>{" "}
                    vs. buying new.
                  </p>
                </div>

                <Link
                  href={productHrefForCategory("accessories")}
                  className="group/all inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-3 text-[0.8125rem] font-medium text-ink transition-colors duration-(--duration-fast) hover:border-ink hover:bg-ink hover:text-surface"
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
                    className="size-3.5 transition-transform duration-(--duration-fast) ease-(--ease-out-quart) group-hover/all:translate-x-1"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** One companion product. Cream plate thumb + copy + price + view arrow. */
function SetupRow({ product, first }: { product: Product; first: boolean }) {
  return (
    <li className={cn(!first && "border-t border-line")}>
      <Link
        href={productHref(product)}
        className="group/row flex items-center gap-4 p-5 transition-colors duration-(--duration-fast) hover:bg-surface-2/60 sm:gap-5 sm:px-8 sm:py-6"
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-plate sm:size-20">
          <Image
            src={product.image.url}
            alt=""
            fill
            sizes="80px"
            className="object-contain p-2 [mix-blend-mode:multiply] transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/row:scale-[1.06]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-ink sm:text-[1.0625rem]">
            {product.name}
          </p>
          <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
            {product.variant}
          </p>
        </div>

        <p className="shrink-0 font-mono text-base font-medium tabular-nums text-ink sm:text-[1.0625rem]">
          {formatPrice(product.price, product.currency, product.locale)}
        </p>

        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-ink",
            "transition-colors duration-(--duration-fast)",
            "group-hover/row:border-ink group-hover/row:bg-ink group-hover/row:text-surface",
          )}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </span>
        <span className="sr-only">View {product.name}</span>
      </Link>
    </li>
  );
}
