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
import { DURATION } from "@/lib/motion";

/**
 * CartFeedbackProvider — the channel between an Add to cart button and the
 * global Add-to-Cart modal.
 *
 * Kept separate from the cart query because this one owns cart *UI*: a
 * product card calls `notifyAdded(lineId)` after a successful add, and the
 * modal reads that line live from `useGetCart`, so ticking an add-on in the
 * modal shows straight away.
 *
 * `nonce` is bumped every time a product is added, so the modal re-runs its
 * enter animation when the same line is added to twice in a row.
 *
 * The modal opens `POPUP_DELAY_MS` after the add, once the button's
 * confetti pop has played, so the modal's backdrop never hides it.
 */

/** The length of the small confetti pop (`ConfettiBurst size="sm"`). */
const POPUP_DELAY_MS = DURATION.slow * 1000;

export interface AddedFeedback {
  /** The cart line the add landed on. */
  lineId: string;
  /** Bumped on each notify so React re-runs the modal transition. */
  nonce: number;
}

interface CartFeedbackContextValue {
  latest: AddedFeedback | null;
  isOpen: boolean;
  notifyAdded: (lineId: string) => void;
  close: () => void;
}

const CartFeedbackContext = createContext<CartFeedbackContextValue | null>(null);

export function CartFeedbackProvider({ children }: { children: ReactNode }) {
  const [latest, setLatest] = useState<AddedFeedback | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openTimer = useRef<number | undefined>(undefined);

  const notifyAdded = useCallback((lineId: string) => {
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      setLatest((prev) => ({ lineId, nonce: (prev?.nonce ?? 0) + 1 }));
      setIsOpen(true);
    }, POPUP_DELAY_MS);
  }, []);

  const close = useCallback(() => {
    window.clearTimeout(openTimer.current);
    setIsOpen(false);
  }, []);

  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  const value = useMemo(
    () => ({ latest, isOpen, notifyAdded, close }),
    [latest, isOpen, notifyAdded, close],
  );

  return (
    <CartFeedbackContext.Provider value={value}>
      {children}
    </CartFeedbackContext.Provider>
  );
}

export function useCartFeedback() {
  const context = useContext(CartFeedbackContext);
  if (!context) {
    throw new Error(
      "useCartFeedback must be used inside <CartFeedbackProvider>",
    );
  }
  return context;
}
