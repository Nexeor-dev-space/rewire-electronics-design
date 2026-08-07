"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scroll — the cinematic glide underlying the whole site.
 *
 * One clock, one order of operations per frame:
 *   GSAP ticker → lenis.raf() writes the scroll position
 *              → Lenis "scroll" event → ScrollTrigger.update()
 * so every scrubbed timeline samples the scroll in the same frame it was
 * written. Running Lenis on its own requestAnimationFrame loop instead
 * puts scroll writes and scrub reads one frame apart — visible jitter on
 * pinned choreography.
 *
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
      // We drive frames from the GSAP ticker below.
      autoRaf: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    // Lag smoothing pauses GSAP's clock after long frames; with an
    // external scroll driver that reads as a hitch, not a save.
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
