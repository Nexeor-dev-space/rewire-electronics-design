import localFont from "next/font/local";

/**
 * Typography system — two voices, both served locally. No Google Fonts,
 * no external requests: `next/font/local` fingerprints and self-hosts
 * every file, so there is one origin and no layout shift on first paint.
 *
 * 1. Söhne      → everything: headings, body, buttons, navigation.
 * 2. Söhne Mono → the technical voice: labels, specs, countdowns, dates.
 *
 * There is no display face. Emphasis is built from weight, size, line
 * breaks and space — never a second family, never italics, never colour.
 * Four weights, and only these:
 *
 *   300 Leicht (Light)          — the quiet opening of a headline
 *   400 Buch (Regular)          — body, and the middle voice in a headline
 *   500 Kräftig (Medium)        — UI: buttons, nav, card titles
 *   700 Dreiviertelfett (Bold)  — the one emphasised phrase per headline
 *
 * ⚠ The Söhne files in /public/fonts are Klim's *trial* cuts. They carry
 * only 68 glyphs — A–Z, a–z, 0–9, comma, period, hyphen — so every other
 * character (· — % : & ? ! ' $ parentheses…) falls through to the stack
 * below. Helvetica leads that stack deliberately: Söhne is drawn from
 * Helvetica, so substituted punctuation is the closest possible match
 * until licensed files with a full character set replace these.
 */

/*
 * Every option below must be an inline literal — the next/font compiler
 * plugin reads these statically, so a shared `const` for the fallback
 * stack fails the build with "Font loader values must be explicitly
 * written literals". Hence the repetition.
 */

export const fontSans = localFont({
  src: [
    {
      path: "../../public/fonts/TestSohne-Leicht-BF663d89cd4952e.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/TestSohne-Buch-BF663d89cd32e6a.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/TestSohne-Kraftig-BF663d89cd37e26.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/TestSohne-Dreiviertelfett-BF663d89ccc5f66.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sohne",
  display: "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
  // Explicit stack instead of a synthesised metric fallback: with this
  // many missing glyphs the substitute is doing real work, not just
  // covering a swap, and Helvetica already matches Söhne's metrics.
  adjustFontFallback: false,
});

export const fontMono = localFont({
  src: [
    {
      path: "../../public/fonts/TestSohneMono-Buch-BF663d89cbcec64.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/TestSohneMono-Kraftig-BF663d89cd2bd2d.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-sohne-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  adjustFontFallback: false,
});

export const fontVariables = `${fontSans.variable} ${fontMono.variable}`;
