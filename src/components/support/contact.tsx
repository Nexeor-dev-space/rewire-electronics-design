"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getSupportChannels, supportContact } from "@/lib/support";
import { cn } from "@/lib/utils";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { SupportIcon } from "./icons";

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
 * Section 04 — the escalation, and the page's close.
 *
 * Deliberately last. Every other section on this page is an attempt to
 * answer the question without anyone having to write a message, so the
 * channels earn their place at the bottom: a reader who has scrolled
 * this far has not found their answer, and that is exactly the moment
 * to hand them a person.
 *
 * The hours sit under the channels rather than inside the chat card.
 * They govern all three — email is answered on the same clock — and a
 * reader who has just been told a person replies deserves to know when
 * before they decide whether to wait.
 */
export function SupportContact() {
  const channels = getSupportChannels();

  return (
    <section
      id="contact"
      aria-labelledby="support-contact-heading"
      className="relative scroll-mt-28 overflow-hidden bg-void pt-(--spacing-section) pb-(--spacing-section)"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(120%_90%_at_50%_0%,rgb(255_255_255/0.05),transparent_70%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <motion.span variants={rise} className="eyebrow block">
            {supportContact.heading}
          </motion.span>

          <h2
            id="support-contact-heading"
            className="mt-8 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.03em] text-ink"
          >
            <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
              <motion.span variants={lineClip} className="block">
                Talk to a person.
              </motion.span>
            </span>
          </h2>

          <motion.p
            variants={rise}
            className="mt-6 max-w-lg text-base leading-relaxed text-ink-secondary"
          >
            No ticket numbers read back at you, and no queue for the sake
            of one. Three ways in, all of them answered by the people who
            certify the devices.
          </motion.p>
        </motion.div>

        {/* ---------- The three channels ---------- */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.08, 0.12)}
          className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-3 lg:mt-16 lg:gap-5"
        >
          {channels.map((channel) => {
            const inner = (
              <>
                <span className="text-ink-muted transition-colors duration-(--duration-base) group-hover:text-ink">
                  <SupportIcon name={channel.icon} />
                </span>

                <span className="mt-7 block font-sans text-[1.25rem] font-light tracking-[-0.02em] text-ink">
                  {channel.label}
                </span>

                <span className="mt-3 block text-[0.9375rem] leading-[1.7] text-ink-secondary">
                  {channel.note}
                </span>

                <span
                  className={cn(
                    "mt-7 flex items-center gap-2.5 border-t border-line pt-5",
                    // Tracking is 0.10em where the rest of the page's mono
                    // labels run 0.16em. The email address is the longest
                    // unbroken string on the site, and in a 3-up grid the
                    // wider setting pushed it 3px past the column — which
                    // costs a whole second line to save nothing.
                    "font-mono text-[0.6875rem] uppercase tracking-[0.1em]",
                    "text-ink transition-colors duration-(--duration-base)",
                  )}
                >
                  {/* `break-words`, never `break-all`: the address has a
                      real break opportunity at its hyphen, so it folds to
                      SUPPORT@REWIRE- / ELECTRONICS.COM on a narrow card
                      instead of severing the .COM mid-word. */}
                  <span className="min-w-0 break-words">{channel.action}</span>
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      "ms-auto size-3.5 shrink-0",
                      "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                      "group-hover:translate-x-1 group-focus-visible:translate-x-1",
                    )}
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              </>
            );

            const shell = cn(
              "group flex h-full flex-col rounded-2xl p-6 text-left lg:p-7",
              "border border-line bg-surface-2",
              "transition-[transform,border-color,background-color] duration-(--duration-base) ease-(--ease-out-expo)",
              "hover:-translate-y-1.5 hover:border-line-strong hover:bg-surface",
              "focus-visible:-translate-y-1.5 focus-visible:border-line-strong",
              "motion-reduce:hover:translate-y-0",
            );

            return (
              <motion.li key={channel.id} variants={rise} className="flex">
                {/* A `mailto:` is not a route — next/link would try to
                    prefetch it. Anchors for external schemes, Link for
                    everything the router owns. */}
                {channel.external ? (
                  <a href={channel.href} className={shell}>
                    {inner}
                  </a>
                ) : (
                  <Link href={channel.href} className={shell}>
                    {inner}
                  </Link>
                )}
              </motion.li>
            );
          })}
        </motion.ul>

        {/* ---------- Hours ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mx-auto mt-10 flex max-w-5xl flex-col items-center gap-2 text-center lg:mt-12"
        >
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ink-muted">
            Hours
          </p>
          {supportContact.hours.map((line) => (
            <p key={line} className="text-[0.9375rem] text-ink-secondary">
              {line}
            </p>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
