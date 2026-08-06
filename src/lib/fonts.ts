import { Inter, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";

/**
 * Typography system — three voices:
 *
 * 1. Inter          → UI, body, navigation. Neutral, precise, invisible.
 * 2. Instrument Serif → Editorial display. Large headlines, italic accents.
 * 3. IBM Plex Mono  → Technical voice. Countdowns, spec sheets, eyebrows, prices.
 */

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const fontDisplay = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const fontVariables = `${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`;
