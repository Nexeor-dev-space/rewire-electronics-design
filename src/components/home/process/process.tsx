"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";

const fade: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/** Cards arrive one after another, left to right. */
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

interface Step {
  id: string;
  title: string;
  body: string;
  image: { src: string; alt: string };
}

const STEPS: Step[] = [
  {
    id: "waitlist",
    title: "Join Waitlist",
    body: "Register your interest before launch.",
    image: {
      src: "/images/process/Join-Waitlist.png",
      alt: "A laptop on an ivory desk showing an email sign-up form, a phone resting beside it",
    },
  },
  {
    id: "reminder",
    title: "Launch Reminder",
    body: "Receive email and WhatsApp notification.",
    image: {
      src: "/images/process/Launch-Reminder.png",
      alt: "A laptop against an ivory wall, its screen showing a single notification bell",
    },
  },
  {
    id: "purchase",
    title: "Purchase",
    body: "Complete checkout before stock sells out.",
    image: {
      src: "/images/process/Purchase.jpg",
      alt: "A hand holding out a payment card at checkout",
    },
  },
  {
    id: "delivery",
    title: "Delivery",
    body: "Your certified device arrives with warranty.",
    image: {
      src: "/images/process/Delivery.png",
      alt: "An open matte black gift box on a stone counter, a phone resting inside",
    },
  },
];

/**
 * Section 05 — How Every Drop Works.
 *
 * A compact editorial grid rather than a spread: the four steps sit in one
 * row, close enough to be read as a single sequence and short enough to
 * hold in one viewport. Separation is space and elevation only — no
 * hairline rules, and no border on the card; the plate is defined by its
 * surface and shadow.
 *
 * Tablet folds it to 2×2; below `sm` it becomes a swipe rail, which keeps
 * the images large without turning the section into a long stack.
 */
export function Process() {
  return (
    <section
      aria-labelledby="process-heading"
      // Top rhythm only: every section owns its own lead-in, and the next
      // section's top padding supplies the gap. Adding a bottom here
      // doubles it into a dead band.
      className="relative bg-void pt-(--spacing-section) pb-(--spacing-section-sm)"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- Header, between rules ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fade}
          className="pt-2"
        >
          <div className="grid gap-x-6 gap-y-4 pb-10 lg:grid-cols-12 lg:items-end">
            <h2
              id="process-heading"
              className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.06] tracking-[-0.03em] text-ink lg:col-span-7"
            >
              How Every Drop Works
            </h2>
            <p className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-4 lg:col-start-9 lg:justify-self-end">
              From registration to delivery in four simple steps.
            </p>
          </div>
        </motion.div>

        {/* ---------- The four steps ---------- */}
        <motion.ol
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className={cn(
            "pt-2",
            // Swipe rail below sm — bleeds to the page edge so a card can
            // sit flush while the rest peek in from the right.
            "no-scrollbar -mx-(--spacing-gutter) flex snap-x snap-mandatory gap-8 overflow-x-auto px-(--spacing-gutter) pb-4",
            "sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0",
            "xl:grid-cols-4",
          )}
        >
          {STEPS.map((step, i) => (
            <motion.li
              key={step.id}
              variants={fade}
              className="w-[78vw] shrink-0 snap-start sm:w-auto"
            >
              <article
                className={cn(
                  "group h-full rounded-xl bg-surface p-6",
                  // No border and no shadow — the plate is defined by its
                  // surface tone alone, so nothing outlines the card.
                  "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                  "hover:-translate-y-1.5",
                  "motion-reduce:hover:translate-y-0",
                )}
              >
                {/* Shorter on phones: at 320px tall the photograph pushed
                    the step's own title and line off the bottom of the
                    card, which inverts what the section is for. */}
                <div className="relative h-52 overflow-hidden rounded-lg bg-surface-2 sm:h-64 lg:h-80">
                  <Image
                    src={step.image.src}
                    alt={step.image.alt}
                    fill
                    sizes="(max-width: 640px) 78vw, (max-width: 1280px) 45vw, 23vw"
                    className={cn(
                      "object-cover",
                      "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
                      "group-hover:scale-[1.03]",
                    )}
                  />
                </div>

                <div className="pt-6">
                  <span className="block font-mono text-[0.8125rem] tabular-nums tracking-[0.2em] text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <h3
                    className={cn(
                      "mt-4 text-2xl font-medium leading-tight tracking-[-0.02em] text-ink",
                      "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                      "group-hover:-translate-y-1",
                      "motion-reduce:group-hover:translate-y-0",
                    )}
                  >
                    {step.title}
                  </h3>

                  <p className="mt-3 text-base leading-relaxed text-ink-secondary">
                    {step.body}
                  </p>
                </div>
              </article>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
