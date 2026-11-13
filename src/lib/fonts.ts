import localFont from "next/font/local";

/**
 * Typography system — one family, served locally. No Google Fonts, no
 * external requests: `next/font/local` fingerprints and self-hosts every
 * file, so there is one origin and no layout shift on first paint.
 *
 * Geist carries everything: headings, body, buttons, navigation, and the
 * technical voice (`font-mono` labels, specs, countdowns) too — no Geist
 * Mono files ship in /public/fonts, so both tokens resolve to Geist.
 *
 * Both files are variable fonts covering 100–900, so every Tailwind
 * weight (`font-light` 300, `font-normal` 400, `font-medium` 500,
 * `font-semibold` 600, `font-bold` 700) renders a true cut rather than a
 * synthesised one. The italic file covers `<em>` in policy rich text.
 */

/*
 * Every option below must be an inline literal — the next/font compiler
 * plugin reads these statically, so a shared `const` fails the build
 * with "Font loader values must be explicitly written literals".
 */

export const fontSans = localFont({
  src: [
    {
      path: "../../public/fonts/Geist-VariableFont_wght.ttf",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/Geist-Italic-VariableFont_wght.ttf",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-geist",
  display: "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

export const fontVariables = fontSans.variable;
