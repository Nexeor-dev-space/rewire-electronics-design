"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * Why the action was refused. The dialog stays open and shows it, so a
   * delete the server blocks — a category that still has children — explains
   * itself where the decision was made rather than behind a closed modal.
   */
  error?: string;
  /** The action is in flight: the buttons lock and confirm shows a spinner. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  error,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    const id = window.setTimeout(() => confirmRef.current?.focus(), 60);

    return () => {
      window.clearTimeout(id);
      document.documentElement.style.overflow = "";
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      // Not while the action is in flight — the request would land anyway,
      // and the result would have nowhere to be reported.
      if (!loading) onCancel();
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
        <div
          className="fixed inset-0 z-100 grid place-items-center px-5"
          onKeyDown={handleKeyDown}
        >
          <motion.button
            type="button"
            aria-label={cancelLabel}
            disabled={loading}
            onClick={onCancel}
            className="absolute inset-0 bg-void/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.menu }}
          />

          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={description ? "confirm-description" : undefined}
            data-lenis-prevent
            className={cn(
              "relative w-full max-w-md rounded-2xl border border-line bg-surface-3 p-6",
              "shadow-(--shadow-float)",
            )}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
          >
            <h2
              id="confirm-title"
              className="text-lg font-medium tracking-tight text-ink"
            >
              {title}
            </h2>

            {description && (
              <div
                id="confirm-description"
                className="mt-2 text-sm leading-relaxed text-ink-secondary"
              >
                {description}
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-7 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
              <Button
                ref={confirmRef}
                type="button"
                size="sm"
                loading={loading}
                onClick={onConfirm}
                className="bg-danger text-white hover:bg-danger/85"
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
