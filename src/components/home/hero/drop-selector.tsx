"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION, EASE_OUT_EXPO, overlayFade } from "@/lib/motion";
import { cn, formatPrice, pad } from "@/lib/utils";
import type { LiveDrop } from "@/lib/drops";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface DropSelectorProps {
  open: boolean;
  onClose: () => void;
  drop: LiveDrop;
  activeIndex: number;
  /** Jumps the hero straight to that device and closes. */
  onSelect: (index: number) => void;
}

/**
 * DropSelector — the whole drop on one screen, on demand.
 *
 * The arrows answer "show me another one"; they cannot answer "what else
 * is in here, and which of them is nearly gone" without four taps and a
 * memory test. This does, and then gets out of the way — a standing grid
 * of four cards inside the hero would cost the product its stage, which
 * is the thing the carousel exists to protect.
 *
 * Each row leads with the unit count because that is what decides which
 * one a visitor opens. The current device is marked with a word rather
 * than a tint alone: a background wash is invisible to anyone not seeing
 * colour, and `aria-current` needs a visible partner.
 *
 * A sheet from the bottom edge on phones, a centred panel from `sm`.
 * Same a11y contract as `WaitlistModal` — labelled dialog role, Escape,
 * backdrop dismiss, focus moved in and restored, Tab held inside, page
 * behind locked.
 */
export function DropSelector({
  open,
  onClose,
  drop,
  activeIndex,
  onSelect,
}: DropSelectorProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

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
          key="drop-selector"
          className="fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center sm:p-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayFade}
          onKeyDown={handleKeyDown}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drop-selector-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-(--shadow-float) focus:outline-none"
          >
            <div aria-hidden className="grain absolute inset-0" />

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p
                    id="drop-selector-title"
                    className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink"
                  >
                    Live drops
                  </p>
                  <p className="mt-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                    {drop.edition} · {drop.title}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drop list"
                  className="-m-2 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--duration-fast) hover:bg-ink/5 hover:text-ink"
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

              <ul className="mt-6 border-t border-line">
                {drop.devices.map((item, i) => {
                  const current = i === activeIndex;
                  return (
                    <li key={item.id} className="border-b border-line">
                      <button
                        type="button"
                        onClick={() => onSelect(i)}
                        aria-current={current ? "true" : undefined}
                        className={cn(
                          "group/row flex w-full items-center gap-4 py-4 text-left",
                          "transition-opacity duration-(--duration-fast)",
                          !current && "hover:opacity-70",
                        )}
                      >
                        <span
                          className={cn(
                            "font-mono text-[0.6875rem] tabular-nums tracking-[0.16em]",
                            current ? "text-ink" : "text-ink-faint",
                          )}
                        >
                          {pad(i + 1)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] font-medium text-ink">
                            {item.name}
                          </span>
                          {/* Price and stock together: choosing between four
                              devices is a question about both, and a list
                              that answers only one sends you back out to
                              check the other. */}
                          <span className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                            <span className="tabular-nums text-urgent">
                              {formatPrice(
                                item.price,
                                drop.currency,
                                drop.locale,
                              )}
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                              <span className="text-urgent">
                                {item.unitsLeft}
                              </span>{" "}
                              units left
                            </span>
                          </span>
                        </span>

                        {/* A word, not just a tint — the selected row has to
                            survive being read without colour. */}
                        {current ? (
                          <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">
                            Showing
                          </span>
                        ) : (
                          <svg
                            aria-hidden
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={cn(
                              "size-3 shrink-0 text-ink-faint",
                              "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                              "motion-safe:group-hover/row:translate-x-1",
                            )}
                          >
                            <path d="M1.5 7h11M8.5 3.5L12 7l-3.5 3.5" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
