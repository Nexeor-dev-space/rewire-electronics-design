"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { SmoothScrollProvider } from "./smooth-scroll-provider";

/**
 * App-wide client providers.
 * MotionConfig `reducedMotion="user"` makes every Framer Motion animation
 * respect the OS-level reduced-motion preference automatically.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
    </MotionConfig>
  );
}
