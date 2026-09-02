"use client";

import { useEffect, useState } from "react";

interface ScrollState {
  /** Page has scrolled past the threshold — header switches to glass. */
  scrolled: boolean;
  /** User is scrolling down — header can retreat off-canvas. */
  scrollingDown: boolean;
}

/**
 * Lightweight scroll observer for header chrome.
 *
 * **Both flags are hysteretic, and that is the whole point of this
 * file.** The naive versions — `scrolled = y > 24` and
 * `scrollingDown = y > lastY` — are what made the header shiver.
 *
 * `scrollingDown` was the worse of the two. Compared against the
 * previous frame's position it flips on a single pixel, and the page
 * runs Lenis, whose smooth scroll and momentum easing deliver a long
 * tail of sub-pixel deltas that alternate sign as a flick settles. Each
 * flip animated the header a full 100% of its own height, so the bar
 * jittered up and down for the length of the easing curve. It now needs
 * `DIRECTION_DELTA` of travel in one direction before it will change
 * its mind, and the reference position only moves when it does — so a
 * settling scroll cannot accumulate a flip one pixel at a time.
 *
 * `scrolled` had the same problem in miniature: parked at exactly the
 * threshold, it toggled the bar between transparent and frosted, which
 * reads as a flicker rather than a jump. It now switches on above
 * `threshold` and off below `threshold - SCROLLED_HYSTERESIS`, so the
 * two edges cannot chase each other.
 */

/**
 * Pixels of travel in one direction before the header will change its
 * mind about which way the reader is going. Roughly one line of body
 * text — comfortably above Lenis' settling noise, and small enough that
 * a deliberate scroll up still reveals the bar immediately.
 */
const DIRECTION_DELTA = 8;

/** How far back up the reader must come before the glass drops away. */
const SCROLLED_HYSTERESIS = 12;

/** Never retreat until the reader is this deep — the top is always open. */
const RETREAT_FLOOR = 120;

export function useScrollState(threshold = 24): ScrollState {
  const [state, setState] = useState<ScrollState>({
    scrolled: false,
    scrollingDown: false,
  });

  useEffect(() => {
    // The last position at which the *direction* was decided, not the
    // last position seen. Comparing against the latter is what let a
    // one-pixel wobble read as a change of direction.
    //
    // Both flags are held here rather than read back out of state,
    // because the hysteresis is a side effect (it moves `anchorY`) and
    // a `setState` updater has to stay pure — React calls it twice
    // under StrictMode, which would advance the anchor by two frames of
    // travel for every one the reader actually made.
    let anchorY = window.scrollY;
    let scrollingDown = false;
    let scrolled = false;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - anchorY;

        if (Math.abs(delta) >= DIRECTION_DELTA) {
          scrollingDown = delta > 0;
          anchorY = y;
        }
        // Above the floor the header is always shown, whichever way the
        // reader is moving.
        if (y <= RETREAT_FLOOR) scrollingDown = false;

        scrolled = scrolled
          ? y > threshold - SCROLLED_HYSTERESIS
          : y > threshold;

        // Bail with the previous object when nothing changed —
        // otherwise every scroll frame re-renders the header for
        // identical values.
        setState((prev) =>
          prev.scrolled === scrolled && prev.scrollingDown === scrollingDown
            ? prev
            : { scrolled, scrollingDown },
        );

        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
