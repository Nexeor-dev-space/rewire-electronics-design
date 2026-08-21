"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * CartFeedbackProvider — the channel between a buy panel and the global
 * Add-to-Cart modal.
 *
 * Kept intentionally separate from the AccountProvider (which owns cart
 * *state*) because this one owns cart *UI*. When AccountProvider is
 * later swapped for a real cart adapter — Payload, Shopify, whatever —
 * this file does not have to change: the buy panel still calls
 * `notifyAdded` with the same shape, and the modal still listens on the
 * same context.
 *
 * `nonce` is bumped every time a product is added, so the modal can
 * re-run its enter animation when the same product is added twice in a
 * row (a bare object equality check would consider it "unchanged" and
 * not re-mount the confirmation).
 */

export interface AddedFeedback {
  productSlug: string;
  variantLabel: string;
  quantity: number;
  /** Unit price paid, in minor units, at the moment of add. */
  unitPrice: number;
  currency: string;
  locale: string;
  /** Bumped on each notify so React re-runs the modal transition. */
  nonce: number;
}

interface CartFeedbackContextValue {
  latest: AddedFeedback | null;
  isOpen: boolean;
  notifyAdded: (input: Omit<AddedFeedback, "nonce">) => void;
  close: () => void;
}

const CartFeedbackContext = createContext<CartFeedbackContextValue | null>(null);

export function CartFeedbackProvider({ children }: { children: ReactNode }) {
  const [latest, setLatest] = useState<AddedFeedback | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const notifyAdded = useCallback(
    (input: Omit<AddedFeedback, "nonce">) => {
      setLatest((prev) => ({ ...input, nonce: (prev?.nonce ?? 0) + 1 }));
      setIsOpen(true);
    },
    [],
  );

  const close = useCallback(() => setIsOpen(false), []);

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
