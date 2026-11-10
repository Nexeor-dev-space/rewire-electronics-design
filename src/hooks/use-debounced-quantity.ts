"use client";

import { useEffect, useRef, useState } from "react";
import { CART_QUANTITY_DEBOUNCE_MS } from "@/lib/constants";

/**
 * A cart quantity that answers taps instantly.
 *
 * `quantity` is what the stepper shows: the tapped value at once, so fast
 * taps all count. The new quantity is sent through `commit` only after
 * `CART_QUANTITY_DEBOUNCE_MS` without another tap, so five quick taps are
 * one request, not five. When that request settles the stepper goes back
 * to showing the server's `value`: the new number on success, the old one
 * if it was refused (the caller shows the mutation's error).
 *
 * Removing a line (going to 0) is not debounced; callers do that directly,
 * calling `cancel` first so a pending tap is not sent for a removed line.
 */
export function useDebouncedQuantity(value: number, commit: (quantity: number) => Promise<unknown>) {
  const [draft, setDraft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function set(next: number) {
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      commit(next)
        .catch(() => {
          /* the mutation's own error state reports it */
        })
        .finally(() => setDraft((current) => (current === next ? null : current)));
    }, CART_QUANTITY_DEBOUNCE_MS);
  }

  function cancel() {
    clearTimeout(timer.current);
    setDraft(null);
  }

  return { quantity: draft ?? value, set, cancel };
}
