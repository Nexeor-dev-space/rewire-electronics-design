"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Dialog — a modal panel for forms and other content that needs the
 * reader's full attention. Same contract as `ConfirmDialog`: focus moves in
 * on open and back to the trigger on close, Escape and the backdrop close
 * it, Tab stays inside, and page scroll is locked.
 *
 * Compose the inside from `DialogBody` (scrolls) and `DialogFooter` (stays
 * put), so a long form never pushes its Save button off screen. Mark the
 * field that should take focus with `data-autofocus`; without one the panel
 * itself is focused.
 *
 * A sheet from the bottom edge on phones, a centred panel from `sm`.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      const panel = panelRef.current;
      (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel)?.focus();
    }, 60);

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

    if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
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
        <div
          className="fixed inset-0 z-100 flex items-end justify-center sm:items-center sm:px-5 sm:py-8"
          onKeyDown={handleKeyDown}
        >
          <motion.button
            type="button"
            tabIndex={-1}
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.menu }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn(
              "relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col outline-none",
              "rounded-t-2xl border border-line bg-surface-3 shadow-(--shadow-float) sm:rounded-2xl",
              className,
            )}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <h2 id={titleId} className="text-lg font-medium tracking-tight text-ink">
                  {title}
                </h2>
                {description && (
                  <div id={descriptionId} className="mt-1 text-sm text-ink-secondary">
                    {description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 -mt-1 rounded-lg p-2 text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="size-4"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** The scrolling middle of a dialog. */
export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-lenis-prevent className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", className)}>
      {children}
    </div>
  );
}

/** Actions pinned under the body. */
export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
