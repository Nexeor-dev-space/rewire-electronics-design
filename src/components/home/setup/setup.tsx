"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  getSetupBundle,
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
import { useAccount } from "@/components/providers/account-provider";
import { useCartFeedback } from "@/components/cart/cart-feedback-provider";

const rise = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/**
 * Complete your setup — a kit, not a shelf.
 *
 * Reframed around the actual behaviour: the anchor is fixed (it's the
 * device the shopper already came for), and the companions are a small
 * multi-select the shopper builds. Selection is *the interaction* — the
 * total, the saving and the CTA all react to it in the same paint, so
 * the block reads as one composition instead of a photo, a list, and a
 * bottom rail.
 *
 * One primary action, orange, that commits the whole selection to the
 * real cart and swaps to a `View cart` handoff on success — a second
 * click sends the shopper on rather than closing the loop mid-page.
 */
export function Setup() {
  const bundle = getSetupBundle();
  if (!bundle) return null;

  const { anchor, additions } = bundle;

  return (
    <section
      aria-labelledby="setup-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-(--spacing-section-sm)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- Section header ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.08)}
          className="grid gap-6 lg:grid-cols-12 lg:items-end"
        >
          <motion.div variants={rise} className="lg:col-span-7">
            <p className="eyebrow">The Rewire Kit</p>
            <h2
              id="setup-heading"
              className="mt-4 font-sans text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.05] tracking-[-0.035em] text-ink"
            >
              Complete your setup.
            </h2>
          </motion.div>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-4 lg:col-start-9 lg:justify-self-end lg:text-right"
          >
            A phone is a phone. The set makes it a working setup — every
            piece inspected together, shipped together, one warranty.
          </motion.p>
        </motion.div>

        {/* ---------- The kit ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
          className="mt-12 grid overflow-hidden rounded-3xl border border-line bg-surface lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
        >
          <AnchorPanel product={anchor} />
          <KitBuilder anchor={anchor} additions={additions} />
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   Anchor — the fixed device on the left of the card
   ============================================================ */

function AnchorPanel({ product }: { product: Product }) {
  return (
    <div className="relative flex flex-col border-b border-line lg:border-b-0 lg:border-r">
      {/* Cream plate, cropped tighter than a hero — cinematic, but not
          the visual centre of the whole section. */}
      <div className="relative aspect-[5/4] w-full overflow-hidden bg-plate sm:aspect-[16/10] lg:aspect-auto lg:flex-1">
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-contain p-8 sm:p-12 lg:p-14"
        />
        {/* Overlay chapter marker — anchors the composition without a
            second block of chrome. */}
        <span className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-void/70 px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink backdrop-blur-sm sm:left-8 sm:top-8">
          <span aria-hidden className="size-1 rounded-full bg-accent" />
          The anchor
        </span>
      </div>

      <div className="border-t border-line p-6 sm:p-8">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink-muted">
          Start with
        </p>
        <p className="mt-2 text-xl font-medium tracking-[-0.015em] text-ink sm:text-2xl">
          {product.name}
        </p>
        <p className="mt-1 text-sm text-ink-secondary">{product.variant}</p>
        <p className="mt-4 font-mono text-lg font-medium tabular-nums text-ink">
          {formatPrice(product.price, product.currency, product.locale)}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Kit builder — companions + live summary + CTA
   ============================================================ */

function KitBuilder({
  anchor,
  additions,
}: {
  anchor: Product;
  additions: Product[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(additions.map((product) => product.id)),
  );
  const [committed, setCommitted] = useState(false);

  const { addItem } = useAccount();
  const { notifyAdded } = useCartFeedback();

  const toggle = (id: string) => {
    setCommitted(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chosen = useMemo(
    () => additions.filter((p) => selected.has(p.id)),
    [additions, selected],
  );

  const total = chosen.reduce((sum, p) => sum + p.price, 0) + anchor.price;
  const savings =
    chosen.reduce((sum, p) => sum + savingAmount(p), 0) + savingAmount(anchor);
  const itemCount = 1 + chosen.length;

  const money = (value: number) =>
    formatPrice(value, anchor.currency, anchor.locale);

  const commitKit = () => {
    if (committed) return;
    // Anchor is always included. Add every selected companion after.
    addItem(anchor.slug, 1);
    chosen.forEach((p) => addItem(p.slug, 1));
    notifyAdded({
      productSlug: anchor.slug,
      variantLabel: anchor.variant,
      quantity: 1,
      unitPrice: anchor.price,
      currency: anchor.currency,
      locale: anchor.locale,
    });
    setCommitted(true);
  };

  return (
    <div className="flex flex-col">
      {/* ---------- Header ---------- */}
      <header className="flex items-baseline justify-between gap-6 border-b border-line p-6 sm:p-8">
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink-muted">
            Complete the kit
          </p>
          <p className="mt-2 text-[0.9375rem] text-ink-secondary">
            Pick the pieces that make it a set.
          </p>
        </div>
        <Link
          href={productHrefForCategory("accessories")}
          className="hidden shrink-0 items-center gap-1.5 text-[0.75rem] font-medium text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink sm:inline-flex"
        >
          Browse all accessories
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      </header>

      {/* ---------- Companion cards ---------- */}
      <ul className="grid gap-3 p-6 sm:grid-cols-3 sm:gap-4 sm:p-8">
        {additions.map((product, i) => (
          <CompanionCard
            key={product.id}
            product={product}
            index={i + 2}
            selected={selected.has(product.id)}
            onToggle={() => toggle(product.id)}
          />
        ))}
      </ul>

      {/* ---------- Summary + CTA ---------- */}
      <div className="mt-auto border-t border-line bg-surface-2/60 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink-muted">
              Your kit · {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
            <p className="mt-2 font-sans text-[clamp(1.75rem,3vw,2.25rem)] font-medium tabular-nums leading-none text-ink">
              {money(total)}
            </p>
            {savings > 0 && (
              <p className="mt-2 text-[0.8125rem] text-ink-secondary">
                Save{" "}
                <span className="font-medium text-accent">
                  {money(savings)}
                </span>{" "}
                vs. buying new.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {committed ? (
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <p className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-live">
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3"
                  >
                    <path d="m3 8 3.5 3.5L13 4.5" />
                  </svg>
                  Kit added
                </p>
                <Link
                  href="/cart"
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6",
                    "bg-accent text-white",
                    "text-sm font-medium",
                    "transition-colors duration-(--duration-fast) hover:bg-accent-hover",
                  )}
                >
                  View cart
                  <svg
                    aria-hidden
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
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={commitKit}
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6",
                  "bg-accent text-white",
                  "text-sm font-medium",
                  "transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
                  "hover:bg-accent-hover active:scale-[0.98]",
                )}
              >
                Add kit to bag
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  className="size-3.5"
                >
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CompanionCard — one selectable extra
   ============================================================ */

function CompanionCard({
  product,
  index,
  selected,
  onToggle,
}: {
  product: Product;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          "group/card relative flex h-full w-full flex-col overflow-hidden rounded-2xl border text-left",
          "transition-[border-color,background-color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
          "active:scale-[0.995]",
          selected
            ? "border-line-strong bg-surface-2 shadow-(--shadow-edge)"
            : "border-line bg-surface hover:border-line-strong",
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-plate">
          <Image
            src={product.image.url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 22vw"
            className={cn(
              "object-contain p-5",
              "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
              "group-hover/card:scale-[1.04]",
            )}
          />
          {/* Chapter index — 02 / 03 / 04. Anchor is 01. */}
          <span className="absolute left-3 top-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink-muted">
            {String(index).padStart(2, "0")}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="truncate text-[0.9375rem] font-medium leading-tight text-ink">
            {product.name}
          </p>
          <p className="truncate text-[0.75rem] text-ink-secondary">
            {product.variant}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[0.9375rem] font-medium tabular-nums text-ink">
              {formatPrice(product.price, product.currency, product.locale)}
            </p>
            <ToggleChip selected={selected} />
          </div>
        </div>
      </button>
    </li>
  );
}

function ToggleChip({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "font-mono text-[0.625rem] uppercase tracking-[0.16em]",
        "transition-[border-color,background-color,color] duration-(--duration-fast)",
        selected
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-line-strong text-ink-muted",
      )}
    >
      {selected ? (
        <>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-2.5"
          >
            <path d="m3 8 3.5 3.5L13 4.5" />
          </svg>
          In kit
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="size-2.5"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add
        </>
      )}
    </span>
  );
}
