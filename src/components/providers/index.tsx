"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { SmoothScrollProvider } from "./smooth-scroll-provider";
import { AccountProvider } from "./account-provider";

/**
 * App-wide client providers.
 * MotionConfig `reducedMotion="user"` makes every Framer Motion animation
 * respect the OS-level reduced-motion preference automatically.
 * AccountProvider carries session and cart state for the navigation.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AccountProvider>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </AccountProvider>
    </MotionConfig>
  );
}
