"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { SmoothScrollProvider } from "./smooth-scroll-provider";
import { AccountProvider } from "./account-provider";
import { CartFeedbackProvider } from "@/components/cart/cart-feedback-provider";
import { AddToCartModal } from "@/components/cart/add-to-cart-modal";

/**
 * App-wide client providers.
 *
 * - MotionConfig `reducedMotion="user"` makes every Framer Motion animation
 *   respect the OS-level reduced-motion preference automatically.
 * - AccountProvider carries session and cart state (the state layer).
 * - CartFeedbackProvider owns the Add-to-Cart modal's open/close state
 *   (the UI layer). Keeping them separate means a real cart adapter can
 *   replace AccountProvider without touching the modal.
 * - AddToCartModal is mounted once, at the root, so any buy panel on any
 *   page can open the same polished confirmation.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AccountProvider>
        <CartFeedbackProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
          <AddToCartModal />
        </CartFeedbackProvider>
      </AccountProvider>
    </MotionConfig>
  );
}
