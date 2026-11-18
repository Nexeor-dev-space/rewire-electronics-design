"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeartIcon } from "@/components/product/heart-icon";
import { TOAST_DURATION_MS } from "@/lib/constants";
import { toastRise } from "@/lib/motion";

/**
 * Toast — a short message that confirms an action and then goes away.
 *
 * One toast at a time: a new one replaces the one on screen and restarts
 * the timer, so rapid adds never pile up. It hides itself after
 * `TOAST_DURATION_MS`. It sits bottom centre, above the mobile tab bar
 * below `lg`, and ignores the pointer, so it never covers a button. It is
 * drawn above the Add to cart modal (`z-[80]`), which opens at the same
 * moment for products with add-ons.
 *
 * The live region is always mounted, so screen readers announce each new
 * message. The pill uses the `commerce-dark` palette of the Add to cart
 * modal, so every cart and wishlist confirmation looks the same.
 */

/** `heart` is the filled saved heart; `heart-outline` confirms an unsave. */
export type ToastIcon = "check" | "heart" | "heart-outline";

interface ToastState {
  id: number;
  message: string;
  icon: ToastIcon;
}

interface ToastContextValue {
  showToast: (message: string, icon?: ToastIcon) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, icon: ToastIcon = "check") => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, icon });
  }, []);

  // Each new toast restarts the timer; the old one is cleared.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-[90] flex justify-center px-(--spacing-gutter) lg:bottom-8"
      >
        <AnimatePresence mode="popLayout">
          {toast && (
            <motion.p
              key={toast.id}
              variants={toastRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="commerce-dark inline-flex max-w-full items-center gap-2.5 rounded-full border border-line bg-surface px-5 py-3 text-[0.875rem] font-medium tracking-tight text-ink shadow-[0_12px_32px_rgb(0_0_0/0.35)]"
            >
              {toast.icon === "check" ? (
                <CheckIcon />
              ) : (
                <HeartIcon saved={toast.icon === "heart"} className="size-4 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 text-live"
    >
      <path d="m3 8 3.5 3.5L13 4.5" />
    </svg>
  );
}
