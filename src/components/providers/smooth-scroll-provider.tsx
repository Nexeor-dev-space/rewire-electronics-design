"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

/**
 * Lenis smooth scroll — the cinematic glide underlying the whole site.
 * - Skipped automatically for users who prefer reduced motion.
 * - Uses native scroll position, so anchors, a11y and SEO stay intact.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      // Gentle inertia — luxury glide, never floaty or laggy.
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    let frame: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
