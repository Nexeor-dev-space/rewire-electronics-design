"use client";

import { useEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION, EASE_OUT_EXPO, overlayFade } from "@/lib/motion";
import { formatDropDate } from "@/lib/utils";
import type { NextDropInfo } from "@/lib/drops";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
  drop: NextDropInfo;
  /**
   * The registration form. Left as a slot so the eight-field flow
   * (name, email, WhatsApp, country, device interest, storage, colour,
   * budget) can drop in without touching this shell.
   */
  children?: ReactNode;
}

/**
 * WaitlistModal — the drop registration surface.
 *
 * Deliberately not a `<dialog>`: the native element can't be given an
 * exit animation without fighting `close()`, and the site already has a
 * hand-rolled overlay language in the header menu. So the a11y contract
 * is implemented explicitly — labelled dialog role, Escape, backdrop
 * dismiss, focus moved in and restored on close, Tab cycling held
 * inside the panel, and the page behind locked from scrolling.
 */
export function WaitlistModal({
  open,
  onClose,
  drop,
  children,
}: WaitlistModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Lock the page and move focus into the panel while open.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";

    const id = window.setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.documentElement.style.overflow = "";
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="waitlist"
          className="fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center sm:p-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayFade}
          onKeyDown={handleKeyDown}
        >
          {/* Scrim */}
          <div
            aria-hidden
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="waitlist-title"
            aria-describedby="waitlist-desc"
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-(--shadow-float) focus:outline-none"
          >
            <div aria-hidden className="grain absolute inset-0" />

            <div className="relative p-7 sm:p-9">
              <div className="flex items-start justify-between gap-6">
                <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-secondary">
                  {drop.drop.edition} · Waitlist
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close waitlist"
                  className="-m-2 flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--duration-fast) hover:bg-black/5 hover:text-ink"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="size-4"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <h2
                id="waitlist-title"
                className="mt-6 font-sans text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.05] tracking-[-0.03em] text-ink"
              >
                Join the waitlist.
              </h2>

              <p
                id="waitlist-desc"
                className="mt-4 text-sm leading-relaxed text-ink-secondary"
              >
                Register for launch reminders, early access notifications, and
                exclusive drop updates.
              </p>

              {/* Drop facts — the same figures the hero states, so the
                  reader never has to hold anything in their head. */}
              <dl className="mt-7 border-t border-line">
                {[
                  { term: "Device", detail: drop.device.name },
                  { term: "Variant", detail: drop.device.variant },
                  {
                    term: "Launches on",
                    detail: formatDropDate(drop.drop.startsAt),
                  },
                  { term: "Release", detail: `${drop.units} certified devices` },
                ].map((row) => (
                  <div
                    key={row.term}
                    className="flex items-baseline justify-between gap-4 border-b border-line py-2.5"
                  >
                    <dt className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink-muted">
                      {row.term}
                    </dt>
                    <dd className="text-xs text-ink-secondary">{row.detail}</dd>
                  </div>
                ))}
              </dl>

              {children && <div className="mt-7">{children}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
