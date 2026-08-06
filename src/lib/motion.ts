import type { Variants, Transition } from "framer-motion";

/* ============================================================
   MOTION VOCABULARY
   One easing family, one duration scale, a small set of named
   movements. Every animation in the app should be composed from
   these — never ad-hoc values scattered through components.
   ============================================================ */

/** Cinematic deceleration — the house easing. Mirrors --ease-out-expo. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
/** Softer symmetric curve for elements that move and return. */
export const EASE_IN_OUT_SOFT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  fast: 0.2, // hover, press, micro feedback
  base: 0.4, // standard UI transitions
  slow: 0.8, // reveals, entrances
  cinematic: 1.2, // hero-level choreography
} as const;

export const transitionBase: Transition = {
  duration: DURATION.slow,
  ease: EASE_OUT_EXPO,
};

/* ---------- Named movements ---------- */

/** Default entrance: rise 24–32px while fading in. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionBase,
  },
};

/** Quiet entrance for media and large surfaces — opacity only. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.cinematic, ease: EASE_OUT_EXPO },
  },
};

/** Product imagery: settle from a slight zoom. Never zoom past 1. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 1.04 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.cinematic, ease: EASE_OUT_EXPO },
  },
};

/** Editorial text: lines rise out of a clipped container. Pair with overflow-hidden parent. */
export const lineReveal: Variants = {
  hidden: { y: "110%" },
  visible: {
    y: "0%",
    transition: transitionBase,
  },
};

/** Parent orchestration — children animate in sequence, not all at once. */
export const staggerChildren = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Overlay panels (mobile menu, drawers). */
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE_OUT_EXPO } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE_OUT_EXPO } },
};

/** Standard viewport trigger: fire once, slightly before fully in view. */
export const viewportOnce = { once: true, margin: "0px 0px -12% 0px" } as const;
