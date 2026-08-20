"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { getLiveDrop } from "@/lib/drops";
import { productHrefForDrop } from "@/lib/route-map";
import { useCountdown } from "@/hooks/use-countdown";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatPrice, pad, savingsPercent } from "@/lib/utils";
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

/**
 * The closing argument — the live drop restated, once, at the point of
 * decision.
 *
 * By here a reader has been given the product, the proof it sells out,
 * the certification, the saving, the categories, the process and other
 * people's experience. Every one of those was a reason to buy; none of
 * them said *when*. This does, and it is the only section on the page
 * allowed to.
 *
 * It shows the scarcest device in the drop rather than the first, because
 * the section's job is a deadline and 2-of-10 makes that case where
 * 8-of-14 does not. Everything is read from `getLiveDrop()`, so it cannot
 * disagree with the hero it echoes.
 *
 * Deliberately one horizontal band, not a full-height block: the page is
 * already long by this point, and a second hero here would read as the
 * site starting over rather than closing.
 */
export function Scarcity() {
  const drop = getLiveDrop();

  // Scarcest first — the deadline is the point.
  const device = [...drop.devices].sort((a, b) => a.unitsLeft - b.unitsLeft)[0];

  const claimed = device.unitsTotal - device.unitsLeft;
  const claimedRatio = claimed / device.unitsTotal;
  const saving = savingsPercent(device.price, device.originalPrice);
  const { days, hours, minutes, isComplete } = useCountdown(drop.endsAt);

  return (
    <section
      aria-labelledby="scarcity-heading"
      // Top rhythm only — see the note in `standard.tsx`.
      className="relative overflow-hidden bg-void pt-(--spacing-section-sm) pb-14 lg:pb-16"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerChildren(0.1)}
        className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)"
      >
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <motion.h2
            variants={rise}
            id="scarcity-heading"
            className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.05] tracking-[-0.035em] text-ink lg:col-span-6"
          >
            The current drop will not wait.
          </motion.h2>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:col-start-8 lg:justify-self-end"
          >
            Every guarantee on this page applies to this device. The only thing
            that changes from here is how long it is still here.
          </motion.p>
        </div>

        {/* One band, read left to right: the object, what it costs, what is
            left of it, and how long you have. Hairlines rather than gaps do
            the separating — four facts spaced apart on white read as a
            dashboard, the same four on a ruled ledger read as a receipt. */}
        <motion.div
          variants={rise}
          className="mt-10 grid overflow-hidden rounded-2xl border border-line bg-surface lg:mt-14 lg:grid-cols-12"
        >
          {/* ---------- The device ---------- */}
          <div className="flex items-start gap-6 p-6 sm:p-8 lg:col-span-4">
            <div className="relative size-28 shrink-0 rounded-xl bg-void sm:size-32">
              <Image
                src={device.image.url}
                alt={device.image.alt}
                fill
                sizes="128px"
                className="object-contain p-3"
              />
            </div>

            <div className="min-w-0">
              <span className="flex items-center gap-2 font-mono text-[0.625rem] uppercase leading-none tracking-[0.22em] text-ink">
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 animate-pulse-dot rounded-full bg-urgent"
                />
                Live drop
              </span>
              <p className="mt-5 truncate text-[1.25rem] font-medium leading-tight tracking-[-0.015em] text-ink">
                {device.name}
              </p>
              <p className="mt-1.5 truncate text-[0.875rem] text-ink-secondary">
                {device.variant}
              </p>
            </div>
          </div>

          {/* ---------- The money ----------
              Ink, not urgent. Orange is reserved for what is scarce; a
              price in the same colour competes with the one number this
              section exists to make you look at. The saving takes the
              copper accent instead — a highlighted value, not a warning. */}
          <Cell className="lg:col-span-3">
            <CellLabel>Price</CellLabel>
            <p className="mt-4 font-sans text-[2rem] font-light leading-none tracking-[-0.035em] tabular-nums text-ink">
              {formatPrice(device.price, drop.currency, drop.locale)}
            </p>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-[0.75rem] tabular-nums">
              <span className="sr-only">Was </span>
              <s className="text-ink-muted">
                {formatPrice(device.originalPrice, drop.currency, drop.locale)}
              </s>
              <span className="uppercase tracking-[0.14em] text-accent">
                {saving}% off
              </span>
            </p>
          </Cell>

          {/* ---------- What is left ---------- */}
          <Cell className="lg:col-span-3">
            <CellLabel>Remaining</CellLabel>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-[2rem] font-light leading-none tracking-[-0.035em] tabular-nums text-urgent">
                {device.unitsLeft}
              </span>
              <span className="text-[0.9375rem] text-ink-secondary">
                of {device.unitsTotal} left
              </span>
            </p>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={device.unitsTotal}
              aria-valuenow={claimed}
              aria-label={`${claimed} of ${device.unitsTotal} ${device.name} devices claimed`}
              className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-line"
            >
              <motion.span
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: claimedRatio }}
                viewport={viewportOnce}
                transition={{
                  duration: DURATION.cinematic,
                  ease: EASE_OUT_EXPO,
                  delay: 0.2,
                }}
                className="block h-full origin-left rounded-full bg-urgent"
              />
            </div>

            <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-secondary">
              <span className="font-medium text-ink">
                {device.claimedRecently} claimed
              </span>{" "}
              in the last 24 hours. No restock planned.
            </p>
          </Cell>

          {/* ---------- The action ---------- */}
          <Cell className="flex flex-col lg:col-span-2">
            <CellLabel>Closes in</CellLabel>
            <p className="mt-4 font-mono text-[1.0625rem] tabular-nums tracking-[0.04em] text-ink">
              {isComplete
                ? "Closed"
                : `${days}d ${pad(hours)}h ${pad(minutes)}m`}
            </p>

            <Link
              href={productHrefForDrop(drop.slug)}
              aria-label={`Grab ${device.name} now`}
              className={cn(
                buttonVariants({ variant: "accent", size: "md" }),
                "mt-6 w-full lg:mt-auto",
              )}
            >
              Grab It Now
            </Link>
          </Cell>
        </motion.div>
      </motion.div>
    </section>
  );
}

/**
 * One column of the ledger. The hairline is the divider — a rule between
 * cells on desktop, a rule above them once they stack.
 */
function Cell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-t border-line p-6 sm:p-8 lg:border-l lg:border-t-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The rail that lines every cell up on the same baseline. */
function CellLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.625rem] uppercase leading-none tracking-[0.22em] text-ink-muted">
      {children}
    </p>
  );
}
