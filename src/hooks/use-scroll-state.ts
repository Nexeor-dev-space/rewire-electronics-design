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
        setState({
          scrolled: y > threshold,
          // Only retreat after some depth; never hide near the top.
          scrollingDown: y > lastY && y > 120,
        });
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
