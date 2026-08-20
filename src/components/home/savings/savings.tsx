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
          {drop.devices.map((device, i) => (
            <motion.li key={device.id} variants={rise}>
              {/* Ground is index-driven rather than hard-coded per device,
                  so a reorder in the drop cannot break the sequence. */}
              <SavingTile device={device} drop={drop} tone={i} />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

/**
 * SavingTile — one composition, three horizontal bands.
 *
 * Header at the top (variant eyebrow + name), product photograph in the
 * middle, pricing block at the bottom. The three read as one editorial
 * spread rather than an image with a caption stapled to it, because the
 * middle band is nothing but space around a floating device — the tile's
 * own ground runs unbroken behind all three bands.
 *
 * The middle band owns a fixed height and the tile grows around it, so
 * the product keeps its scale at every width. That is what makes four
 * different silhouettes read as one set: the frame does not change, and
 * each device fills the middle as it naturally wants to — phone tall,
 * laptop wide, watch compact, headphones broad.
 */
/**
 * The four grounds, in order. Each is a pale wash lifted a shade at the
 * product's centre and settling to its own tone at the edges, so the
 * device still has something to sit against rather than floating on flat
 * colour.
 *
 * Chosen at very low chroma and kept warm-leaning: ink stays the darkest
 * thing on the tile, and the orange price reads as the one accent rather
 * than competing with the ground. Anything more saturated turns a value
 * argument into a toy shop.
 *
 * The tint is capped by contrast, not by taste. `urgent` (#c2410c) is
 * printed here at 12px ("41% off") and 18px ("You save …"), both of
 * which need 4.5:1 — so every edge stop is held at roughly the page's
 * own luminance, where that accent clears AA. Deepening these a couple
 * of shades looks richer and quietly drops the saving line to ~4.1.
 */
const TONES = [
  // Sand
  "bg-[radial-gradient(130%_100%_at_50%_15%,#FBF8F1_0%,#F5F1E7_100%)]",
  // Sage
  "bg-[radial-gradient(130%_100%_at_50%_15%,#F6F9F3_0%,#EFF3EC_100%)]",
  // Blush
  "bg-[radial-gradient(130%_100%_at_50%_15%,#FCF6F3_0%,#F7EFEB_100%)]",
  // Mist
  "bg-[radial-gradient(130%_100%_at_50%_15%,#F5F9FB_0%,#EDF2F5_100%)]",
] as const;

function SavingTile({
  device,
  drop,
  tone = 0,
}: {
  device: LiveDropDevice;
  drop: LiveDrop;
  /** Index into `TONES`; wraps, so the grid can grow past four. */
  tone?: number;
}) {
  const saving = savingsPercent(device.price, device.originalPrice);
  const savedAmount = device.originalPrice - device.price;

  // Availability comes from stock, not from a flag. A device with
  // nothing left still prints its full pricing — the argument the
  // section makes holds whether or not this particular one can be
  // bought today.
  const soldOut = device.unitsLeft <= 0;

  const body = (
    <>
      {/* ---------- Header ---------- */}
      <div className="lg:col-start-1 lg:row-start-1">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          {device.variant}
        </p>
        <h3 className="mt-2 text-[clamp(1.375rem,1.9vw,1.75rem)] font-medium leading-tight tracking-[-0.02em] text-ink">
          {device.name}
        </h3>
      </div>

      {/* ---------- Product ----------
          An explicit height, not `flex-1`. The tile used to be locked to
          a fixed aspect ratio and hand the product whatever the two text
          blocks left over — which was 45px on desktop and 14px on a
          phone, so the device was effectively invisible at every size.
          Giving the band its own height and letting the tile grow to fit
          is what makes the photograph the centre of the composition it
          was always described as.

          `object-contain` keeps every silhouette honest — no cropping,
          no forced parity, just the device at its real proportions. */}
      {/* Tight margins on purpose: the cutouts already carry ~10% of
          their own transparent breathing room, so a generous margin here
          reads as a hole between the product and its price.

          From `lg` the band leaves the stack and takes its own column
          beside the text, spanning both rows. The cutouts are square, so
          a contained product can only ever be as wide as the band is
          tall — in a full-width band that stranded ~330px of every card
          as dead space and pushed the card 300px taller than it needed
          to be. Beside the text, that width becomes the product. */}
      <div
        className={cn(
          "relative my-4 h-52 shrink-0 sm:my-5 sm:h-60",
          // The band's min-height is what sets the card's height at `lg`:
          // it exceeds the text column, so the two rows size to the
          // product rather than to the pricing block.
          "lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:my-0 lg:h-auto lg:min-h-[19rem]",
        )}
      >
        <Image
          src={device.image.url}
          /* Decorative — the name is announced immediately after,
             inside the same link. */
          alt=""
          fill
          sizes="(max-width: 768px) 88vw, (max-width: 1280px) 46vw, 40vw"
          className={cn(
            "object-contain",
            soldOut && "opacity-50",
            "transition-transform duration-(--duration-cinematic) ease-(--ease-out-expo)",
            !soldOut && [
              "motion-safe:group-hover/save:scale-[1.04]",
              "motion-safe:group-focus-visible/save:scale-[1.04]",
            ],
          )}
        />
      </div>

      {/* ---------- Pricing ---------- */}
      <div className="lg:col-start-1 lg:row-start-2 lg:self-end">
        {/* The strongest thing after the photograph. Sold-out tiles go
            to ink because urgent orange on an unbuyable device reads
            "buy me" and the argument here is about value, not stock. */}
        <p
          className={cn(
            "font-sans font-light leading-none tracking-[-0.035em] tabular-nums",
            "text-[clamp(2.25rem,3.2vw,2.75rem)]",
            soldOut ? "text-ink-muted" : "text-urgent",
          )}
        >
          {formatPrice(device.price, drop.currency, drop.locale)}
        </p>

        {/* What it costs new, and by how much that is beaten. The word
            "new" labels the struck price rather than leaving it to the
            reader to guess — a crossed number without a label is a
            price you have to interpret. */}
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[0.75rem] tabular-nums">
          <span className="sr-only">Was </span>
          <s className="text-ink-muted">
            {formatPrice(device.originalPrice, drop.currency, drop.locale)}
          </s>
          <span aria-hidden className="text-ink-faint">
            new
          </span>
          {!soldOut && saving > 0 && (
            <span className="ms-0.5 font-medium uppercase tracking-[0.14em] text-urgent">
              {saving}% off
            </span>
          )}
        </p>

        {/* The figure that actually lands: what stays in your pocket, in
            AED rather than percent. Above a hairline that separates the
            comparison from the take-away. */}
        {!soldOut && savedAmount > 0 && (
          <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-line pt-3.5">
            <span
              className={cn(
                "font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted",
                "transition-colors duration-(--duration-base)",
                "group-hover/save:text-ink group-focus-visible/save:text-ink",
              )}
            >
              You save
            </span>
            <span className="font-sans text-[1.125rem] font-normal tabular-nums tracking-[-0.02em] text-urgent">
              {formatPrice(savedAmount, drop.currency, drop.locale)}
            </span>
          </p>
        )}

        {/* Editorial link, not a button: the section is a value
            argument, and a filled pill would turn it into the product
            grid it is not. */}
        {soldOut ? (
          <span className="mt-4 inline-block text-[0.8125rem] font-medium text-ink-muted">
            Sold out
          </span>
        ) : (
          <span
            className={cn(
              "mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium",
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
    </>
  );

  // One link over the whole tile — the visible affordance is "View
  // device" but nobody aims for text when a card-sized target exists.
  // A sold-out device has nowhere useful to send anyone, so it is
  // deliberately not a link at all.
  // No fixed aspect ratio: the tile sizes to its own content, so the
  // product band keeps its height at every width instead of being
  // squeezed out by the text above and below it.
  //
  // The tile itself does not lift or cast a shadow on hover. The
  // interaction is carried by the product (a slight zoom) and the "View
  // device" link (underline and arrow) — the plate stays put. Keyboard
  // users still get the global accent `:focus-visible` ring on the link.
  const shell = cn(
    "group/save relative grid h-full grid-cols-1 content-start overflow-hidden rounded-3xl",
    // From `lg`: text column, product column. `1fr` rows put the pricing
    // at the foot of its column while the product spans the full height.
    "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8",
    "border border-line p-6 sm:p-7 lg:p-8",
    TONES[tone % TONES.length],
    "transition-colors duration-(--duration-base) ease-(--ease-out-expo)",
    !soldOut && "hover:border-line-strong focus-within:border-line-strong",
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
