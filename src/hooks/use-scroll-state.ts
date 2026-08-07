"use client";

import { useEffect, useState } from "react";

interface ScrollState {
  /** Page has scrolled past the threshold — header switches to glass. */
  scrolled: boolean;
  /** User is scrolling down — header can retreat off-canvas. */
  scrollingDown: boolean;
}

/** Lightweight scroll observer for header chrome. */
export function useScrollState(threshold = 24): ScrollState {
  const [state, setState] = useState<ScrollState>({
    scrolled: false,
    scrollingDown: false,
  });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const scrolled = y > threshold;
        // Only retreat after some depth; never hide near the top.
        const scrollingDown = y > lastY && y > 120;
        // Bail with the previous object when nothing changed — otherwise
        // every scroll frame re-renders the header for identical values.
        setState((prev) =>
          prev.scrolled === scrolled && prev.scrollingDown === scrollingDown
            ? prev
            : { scrolled, scrollingDown },
        );
        lastY = y;
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
