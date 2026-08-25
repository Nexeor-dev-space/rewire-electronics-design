"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { WaitlistModal } from "@/components/home/hero/waitlist-modal";
import { getNextDrop } from "@/lib/drops";
import { formatDropDate } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/**
 * Section 07 — The Invitation.
 *
 * The page's closing note, and the only place it asks for anything.
 * A single centred statement over a wide-set ledger of the next drop:
 * no cards, no icons, no second CTA competing for the eye. Short by
 * design — the reader either joins here or leaves knowing when to
 * come back.
 */
export function Invitation() {
  const nextDrop = getNextDrop();
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const ledger = [
    { label: "Next release", value: nextDrop.drop.edition },
    { label: "Opens", value: formatDropDate(nextDrop.drop.startsAt) },
    { label: "Allocation", value: `${nextDrop.units} devices` },
  ];

  return (
    <>
      <section
        aria-labelledby="invitation-heading"
        // The page's one dark band, and its last word. `theme-dark` inverts
        // the palette tokens on this scope, so every child — ink, hairlines,
        // the CTA — resolves from the dark palette with no hard-coded colour.
        // Flat by intent: no wash, no glow, no gradient behind the statement.
        //
        // Carries the full rhythm on both sides: the section above closes on
        // a flush-edge photograph with no bottom padding of its own.
        className="theme-dark relative bg-void py-(--spacing-section-sm)"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="relative mx-auto w-full max-w-[110rem] px-(--spacing-gutter) text-center"
        >
          <h2
            id="invitation-heading"
            className="mx-auto max-w-3xl font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.035em] text-ink"
          >
            The next one goes quickly too.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-ink-secondary">
            Join the waitlist for first access, launch reminders, and nothing
            else.
          </p>

          <div className="mt-11 flex justify-center">
            <Button
              variant="accent"
              size="lg"
              onClick={() => setWaitlistOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={waitlistOpen}
            >
              Join the waitlist
            </Button>
          </div>

          {/* The facts, set wide and quiet beneath the ask */}
          <dl className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-y-8 border-t border-line pt-10 sm:grid-cols-3 sm:gap-x-10">
            {ledger.map((item) => (
              <div key={item.label} className="text-center">
                <dt className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-ink-muted">
                  {item.label}
                </dt>
                <dd className="mt-3 text-lg font-medium tracking-[-0.01em] text-ink">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </section>

      {/* Outside the dark band on purpose: the modal must look the same here
          as it does opened from the header or the hero. */}
      {/* Section CTA — general waitlist. The section is about "the next
          one goes quickly too", not any specific device, so the modal
          opens with device + variant selects rather than a preselect. */}
      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </>
  );
}
