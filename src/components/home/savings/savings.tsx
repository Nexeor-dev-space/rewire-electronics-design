"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { getLiveDrop, type LiveDrop, type LiveDropDevice } from "@/lib/drops";
import { productHrefForDrop } from "@/lib/route-map";
import { cn, formatPrice, savingsPercent } from "@/lib/utils";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

const lineClip = {
  hidden: { y: "140%" },
  visible: { y: "0%", transition: { duration: 1, ease: EASE_OUT_EXPO } },
};

/**
 * More device. Less spend. — the money, as an editorial spread.
 *
 * Everything here is computed from the live drop's own prices: the
 * headline percentage is the best real saving in the release, and each
 * card's figures come from the same pair the hero prints. Nothing is
 * authored, so this section cannot drift out of agreement with the
 * product it is describing — the failure mode of every "save up to" band
 * ever shipped.
 *
 * The four narrow cells this section used to run as a shop shelf. The
 * previous split (photograph left, caption right) was already a step
 * closer to editorial; the current 2×2 goes the rest of the way. Each
 * tile is one composition: variant and name above, product photograph as
 * the visual centre, price and saving below. Nothing is a card of a card.
 * The Upcoming Drops grid is still the site's functional ecommerce cell;
 * this section is a value moment, and the moment is larger.
 *
 * The restraint that keeps it out of marketplace territory: one accent
 * per tile, spent on the price and its saving. Struck originals are
 * muted, no badge or burst, and no colour on the surrounding chrome. A
 * premium retailer states a reduction; a discounter decorates one.
 */
export function Savings() {
  const drop = getLiveDrop();

  // The strongest saving actually available, not a marketing ceiling.
  const best = drop.devices.reduce(
    (max, d) => Math.max(max, savingsPercent(d.price, d.originalPrice)),
    0,
  );

  return (
    <section
      aria-labelledby="savings-heading"
      // The page's one tonal band. A half-step down from `void` onto
      // `surface-2` is enough to read as its own panel between two ivory
      // sections, and it makes the pale tiles sit *on* something rather
      // than dissolving into the page.
      //
      // A reduced bottom rhythm rather than the full one: the cards need
      // air beneath them, but the next section already pads its own top,
      // and two full section paddings stack into a dead gap. The band
      // does need *some* bottom, though — without it the tone would stop
      // flush against the last tile.
      className="relative overflow-hidden bg-surface-2 pb-(--spacing-section-sm) pt-(--spacing-section)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
        >
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2
              id="savings-heading"
              className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.03] tracking-[-0.035em] text-ink lg:col-span-6"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  More device.
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Less spend.
                </motion.span>
              </span>
            </h2>

            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:col-start-8 lg:justify-self-end"
            >
              Premium technology does not have to come at a premium price. The
              same certification, the same warranty — for meaningfully less
              than new.
            </motion.p>
          </div>

          {/* ---------- The statement ----------
              Derived, so it can never overstate. `best` is the largest real
              saving in the drop below it. The accent is on the figure
              alone: tint the whole clause and the line starts reading as a
              banner rather than a sentence. */}
          <motion.p
            variants={rise}
            className="mt-14 border-t border-line pt-10 font-sans text-[clamp(2rem,6.5vw,3.75rem)] font-light leading-[0.98] tracking-[-0.04em] text-ink lg:mt-20"
          >
            Up to{" "}
            <span className="font-normal tabular-nums text-urgent">
              {best}%
            </span>{" "}
            less than buying new.
          </motion.p>
        </motion.div>

        {/* ---------- The evidence ----------
            2×2 from `md`; single column on phones. The four tiles are
            deliberately the same shape, not because a shelf demands it
            but because a set of four different silhouettes only reads as
            one system when the frames match — the variation comes from
            how each product sits inside that frame. */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.09, 0.1)}
          className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:mt-16 lg:gap-10"
        >
          {drop.devices.map((device) => (
            <motion.li key={device.id} variants={rise}>
              <SavingTile device={device} drop={drop} />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

/**
 * SavingTile — split editorial: cream photography plate on the left,
 * dark data panel on the right.
 *
 * The previous version buried the product (matte-black cutouts on
 * dark-tinted graphite grounds read as an empty rectangle) and asked
 * four subtle tint variants to do the work of visual differentiation
 * that the products themselves already do. The redesign accepts that
 * the product is the star and gives it a lit plate to sit on: the
 * warm `--color-plate` cream that the drop cards and storefront cards
 * use, with `mix-blend-mode: multiply` on the image so the baked-in
 * white studio background bleeds into the plate and the cutout picks
 * up only a whisper of warm cast.
 *
 * The data panel opposite it holds the pricing at editorial scale:
 * variant + name at the top, big burnt-orange price beneath, struck
 * original and % off below that on a hairline row, the AED saving
 * line on its own row separated by another hairline, and the CTA at
 * the foot. One accent per tile (the price and its saving), no bg
 * variation between the four — the product silhouettes carry the
 * variety on their own.
 *
 * `soldOut` still renders the whole card in ink rather than accent —
 * urgent orange on an unbuyable device reads "buy me", and the
 * section's argument is about value, not stock.
 */
function SavingTile({
  device,
  drop,
}: {
  device: LiveDropDevice;
  drop: LiveDrop;
}) {
  const saving = savingsPercent(device.price, device.originalPrice);
  const savedAmount = device.originalPrice - device.price;
  const soldOut = device.unitsLeft <= 0;

  const body = (
    <>
      {/* ---------- Product plate ----------
          Cream editorial ground, same as every other product plate on
          the site so the section reads as part of the shop rather than
          as its own brand moment. Fixed portrait aspect on phones,
          full-height on the split layout at `sm+` — the two-column card
          gives the plate its own vertical rail. */}
      <div className="relative aspect-[5/4] shrink-0 overflow-hidden bg-plate sm:aspect-auto sm:w-[46%]">
        <Image
          src={device.image.url}
          alt=""
          fill
          sizes="(max-width: 640px) 92vw, (max-width: 1280px) 22vw, 20vw"
          className={cn(
            "object-cover [mix-blend-mode:multiply]",
            "transition-transform duration-(--duration-cinematic) ease-(--ease-out-expo)",
            soldOut && "opacity-50 grayscale",
            !soldOut && [
              "motion-safe:group-hover/save:scale-[1.04]",
              "motion-safe:group-focus-visible/save:scale-[1.04]",
            ],
          )}
        />
      </div>

      {/* ---------- Data panel ----------
          Vertical hierarchy inside a flex-col: identity at the top,
          pricing pushed to the bottom by `mt-auto`, so the CTA sits on
          the same baseline regardless of variant-line length. */}
      <div className="flex flex-1 flex-col p-6 sm:p-7 lg:p-8">
        <div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
            {device.variant}
          </p>
          <h3 className="mt-2 text-[clamp(1.25rem,1.7vw,1.625rem)] font-medium leading-tight tracking-[-0.02em] text-ink">
            {device.name}
          </h3>
        </div>

        <div className="mt-auto pt-8">
          {/* Big burnt-orange price — the strongest figure on the tile
              after the photograph. Sold-out slips to ink because
              accent on an unbuyable device is a false promise. */}
          <p
            className={cn(
              "font-sans font-light leading-none tracking-[-0.035em] tabular-nums",
              "text-[clamp(1.875rem,2.6vw,2.5rem)]",
              soldOut ? "text-ink-muted" : "text-urgent",
            )}
          >
            {formatPrice(device.price, drop.currency, drop.locale)}
          </p>

          {/* Struck original + saving %, on a hairline row that reads
              as the comparison against `new`. */}
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-line pt-3 font-mono text-[0.75rem] tabular-nums">
            <span className="sr-only">Was </span>
            <s className="text-ink-muted">
              {formatPrice(device.originalPrice, drop.currency, drop.locale)}
            </s>
            <span aria-hidden className="text-ink-faint">
              new
            </span>
            {!soldOut && saving > 0 && (
              <span className="ms-auto font-medium uppercase tracking-[0.14em] text-urgent">
                {saving}% off
              </span>
            )}
          </p>

          {/* The AED that stays in your pocket — the take-away figure,
              on its own row above the CTA hairline. */}
          {!soldOut && savedAmount > 0 && (
            <p className="mt-3 flex items-baseline justify-between gap-4">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
                You save
              </span>
              <span className="font-sans text-[1rem] font-medium tabular-nums tracking-[-0.02em] text-accent">
                {formatPrice(savedAmount, drop.currency, drop.locale)}
              </span>
            </p>
          )}

          {/* CTA sits below the whole pricing block, separated by
              another hairline for editorial rhythm. */}
          <div className="mt-6 border-t border-line pt-4">
            {soldOut ? (
              <span className="text-[0.8125rem] font-medium text-ink-muted">
                Sold out
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[0.8125rem] font-medium",
                  "text-ink-secondary transition-colors duration-(--duration-fast)",
                  "group-hover/save:text-ink group-focus-visible/save:text-ink",
                )}
              >
                <span className="relative">
                  View device
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-current",
                      "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                      "group-hover/save:origin-left group-hover/save:scale-x-100",
                      "group-focus-visible/save:origin-left group-focus-visible/save:scale-x-100",
                    )}
                  />
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "size-3 transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                    "motion-safe:group-hover/save:translate-x-1",
                    "motion-safe:group-focus-visible/save:translate-x-1",
                  )}
                >
                  <path d="M1.5 7h11M8.5 3.5L12 7l-3.5 3.5" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const shell = cn(
    "group/save relative flex h-full flex-col overflow-hidden rounded-3xl",
    // Stacked on phones (plate on top, data below); side-by-side from
    // `sm+` so the tile reads as a two-column editorial spread on any
    // canvas wider than a phone. `min-h-[18rem]` on the split layout
    // gives the plate enough vertical rail for the product to breathe.
    "sm:flex-row sm:min-h-[18rem]",
    "border border-line-strong bg-surface",
    "transition-colors duration-(--duration-base) ease-(--ease-out-expo)",
    !soldOut && "hover:border-white/[0.22] focus-within:border-white/[0.22]",
  );

  if (soldOut) {
    return (
      <div className={shell}>
        {body}
        <span className="sr-only">This device is sold out.</span>
      </div>
    );
  }

  return (
    <Link href={productHrefForDrop(device.slug)} className={shell}>
      {body}
    </Link>
  );
}
