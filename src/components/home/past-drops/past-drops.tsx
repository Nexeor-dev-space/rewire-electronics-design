"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { getPastDrops } from "@/lib/drops";
import { cn, formatPrice, formatDropDate, savingsPercent } from "@/lib/utils";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 28 },
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
 * Gone in a Drop — a premium archive, placed where doubt starts.
 *
 * A shopper who has just browsed the calendar is weighing "should I
 * wait?" This is the answer, and it works by being *quiet* — the whole
 * section reads a tone below the active shelves above it: eyebrow +
 * refined heading, muted photography, ink prices instead of urgent,
 * discount in ink-muted rather than accent orange.
 *
 * The cards are links now (matching the site's `/drops/${slug}` route)
 * but the affordance stays whispered: a `View drop →` line appears only
 * on hover. That is the whole difference between "shop" and "archive" —
 * both are clickable, but only one asks you to click.
 *
 * The restraint is load-bearing. A red SOLD OUT stamp would read as a
 * shop that failed to restock; a hairline label on a muted photograph
 * reads as a record of things that went. Same fact, opposite feeling,
 * and only one of them makes the next drop urgent.
 */
export function PastDrops() {
  const drops = getPastDrops();

  return (
    <section
      aria-labelledby="past-drops-heading"
      // Top rhythm only — see the note in `standard.tsx`.
      className="relative overflow-hidden bg-void pt-(--spacing-section-sm)"
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
          <div className="lg:col-span-6">
            <h2
              id="past-drops-heading"
              // Two steps below the active shelves (which run 60–72px),
              // not one. This section is a footnote to them: it exists to
              // prove the drops run out, and a footnote set at hero scale
              // argues with the thing it is supporting.
              className="font-sans text-[clamp(1.75rem,2.6vw,2.5rem)] font-light leading-[1.05] tracking-[-0.03em] text-ink"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Gone in a drop.
                </motion.span>
              </span>
            </h2>
          </div>

          {/* Description is secondary here: smaller and one shade
              lighter than the active-section descriptions above, which
              carries the "quieter than what came before" note the whole
              archive is set to. */}
          <motion.p
            variants={rise}
            className="max-w-md text-sm leading-relaxed text-ink-muted lg:col-span-5 lg:col-start-8 lg:justify-self-end"
          >
            Limited quantities, released once. When a drop is gone it is gone —
            these are the ones that already went.
          </motion.p>
        </motion.div>
      </div>

      {/* Rail below `md` so a phone always sees a partial card cut at the
          edge — the cheapest way to say "there are more of these". At
          `md` it becomes a proper 2-column grid so tablets stop swiping
          for four items, and `xl` opens out to the classic 4-up. */}
      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerChildren(0.08, 0.1)}
        aria-label="Sold-out drops"
        className={cn(
          "no-scrollbar relative z-10 mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-(--spacing-gutter) px-(--spacing-gutter) pb-2 lg:mt-11",
          "md:grid md:grid-cols-2 md:gap-6 md:overflow-visible xl:grid-cols-4 xl:gap-7",
        )}
      >
        {drops.map((drop) => {
          const saving = savingsPercent(drop.price, drop.originalPrice);
          return (
            <motion.li
              key={drop.id}
              variants={rise}
              // Mobile rail: at 90% of the padded content area the
              // primary card fills the frame and ~10–12% of the next
              // shows past the gutter — the brief's "≈1.1 cards visible"
              // measured against the viewport, not the container.
              className="w-[90%] shrink-0 snap-start md:w-auto md:shrink"
            >
              {/* The card is a link now — the archive routes to
                  `/drops/${slug}`, matching the pattern the active
                  section uses. The visible CTA below stays whispered
                  (only on hover), so the click surface exists without
                  turning the card into a shelf tile. */}
              <Link
                href={`/drops/${drop.slug}`}
                aria-label={`View the ${drop.name} archive`}
                className="group/past block"
              >
                {/* Square, not 4:5. A tall plate gives a sold-out device
                    the same stage as a buyable one; square keeps the
                    product legible while taking a third less height. */}
                <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
                  <Image
                    src={drop.image.url}
                    alt={drop.image.alt}
                    fill
                    sizes="(max-width: 768px) 85vw, (max-width: 1280px) 44vw, 22vw"
                    // Grayscale and slightly dimmed — reads as closed at
                    // a glance rather than after reading four labels.
                    // Hover lifts opacity back to full: the earlier flat
                    // `opacity-55` buried the photography permanently,
                    // which is the one thing this section exists to show.
                    className={cn(
                      "object-cover grayscale opacity-65",
                      "transition-[transform,opacity] duration-(--duration-slow) ease-(--ease-out-expo)",
                      "group-hover/past:opacity-100 group-focus-visible/past:opacity-100",
                      "motion-safe:group-hover/past:scale-[1.03]",
                      "motion-safe:group-focus-visible/past:scale-[1.03]",
                    )}
                  />

                  {/* A floating pill, not a caption bar — matches the
                      house pattern for status on a photograph (see
                      `UrgencyOverlay` on the active drop cards): inset
                      from the edges, `glass-strong` for its own quiet
                      hairline, no rule cutting across the image. A large
                      red badge would read as "sale that failed"; this
                      reads as a record. */}
                  <span className="glass-strong absolute inset-x-4 bottom-4 mx-auto w-fit rounded-full px-3.5 py-1.5 text-center font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink shadow-(--shadow-soft)">
                    Sold out
                  </span>
                </div>

                {/* Reading order matches the archive hierarchy: name and
                    price are primary, variant and saving are secondary,
                    drop/date is tertiary and sits last. Everything a
                    shade quieter than the active shelves above — no
                    orange on the discount, price in ink, muted metadata. */}
                <div className="mt-4 px-1">
                  <h3 className="truncate text-[0.9375rem] font-medium leading-tight tracking-[-0.01em] text-ink">
                    {drop.name}
                  </h3>

                  {/* Price, what it was, and the gap — one line rather
                      than three stacked rows. Ink not urgent: orange
                      would falsely signal "buy me", and the archive's
                      whole job is to be quieter than the shelves above. */}
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-sans text-[1.125rem] font-light leading-none tracking-[-0.03em] tabular-nums text-ink">
                      {formatPrice(drop.price, drop.currency, drop.locale)}
                    </span>
                    <span className="sr-only">was </span>
                    <s className="font-mono text-[0.6875rem] tabular-nums text-ink-muted">
                      {formatPrice(
                        drop.originalPrice,
                        drop.currency,
                        drop.locale,
                      )}
                    </s>
                    {saving > 0 && (
                      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                        {saving}% off
                      </span>
                    )}
                  </p>

                  {/* Variant carries the allocation size too. The old
                      "15 / 15 claimed" row mostly restated the SOLD OUT
                      stamp on the photograph; how few there ever were is
                      the part that carried evidence, and it rides here
                      rather than on the footer line, which has to share
                      its width with the hover affordance. */}
                  <p className="mt-2 truncate text-[0.8125rem] text-ink-secondary">
                    {drop.variant} · {drop.units} units
                  </p>

                  {/* Tertiary — edition and date, no rule. The card
                      closes on space rather than a line now that the
                      image no longer ends on one either; a hairline here
                      would be the one divider left on an otherwise quiet
                      card. "View drop →" sits opposite, whispered until
                      hover. The dot is its own element (not inline text)
                      so its spacing matches the house convention used for
                      every other "label · label" pairing on the page. */}
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
                      {drop.edition}
                      <span aria-hidden className="mx-1.5 text-ink-faint">
                        ·
                      </span>
                      {formatDropDate(drop.soldOutAt)}
                    </p>

                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 text-[0.75rem] text-ink-secondary",
                        // The whisper: invisible at rest, drifts in on
                        // hover. Arrow slides a hair further on top of
                        // that — a two-part reveal, both subtle enough
                        // to keep the section reading as archive.
                        "opacity-0 transition-opacity duration-(--duration-base) ease-(--ease-out-expo)",
                        "group-hover/past:opacity-100 group-focus-visible/past:opacity-100",
                      )}
                    >
                      View drop
                      <svg
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn(
                          "size-3 transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                          "motion-safe:group-hover/past:translate-x-1",
                          "motion-safe:group-focus-visible/past:translate-x-1",
                        )}
                      >
                        <path d="M1.5 7h11M8.5 3.5L12 7l-3.5 3.5" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
