import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * LogoMark — the Rewire logo as an inline SVG: REWIRE with a square full
 * stop, ELECTRONICS in mono beneath, ELECTRONICS the full width and REWIRE three quarters of it.
 *
 * Transparent and drawn in theme tokens, so one mark serves every ground:
 * white lettering on the dark storefront, checkout and admin dark theme;
 * black lettering on light grounds (the invoice, the admin light theme).
 * `fill-ink` is the name line, `fill-ink-muted` the ELECTRONICS line and
 * `fill-accent` the full stop. Size it with a height class; the width
 * follows the viewBox.
 */

/* Proportions taken from the artwork: ELECTRONICS spans the full width,
   REWIRE three quarters of it with the full stop just after, and both
   lines have about the same cap height. */
const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 92;
const NAME_WIDTH = 300;
const LINE_WIDTH = VIEWBOX_WIDTH;

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label={siteConfig.name}
      className={cn("block h-9 w-auto", className)}
    >
      <text
        x="0"
        y="36"
        textLength={NAME_WIDTH}
        lengthAdjust="spacing"
        className="fill-ink font-sans text-[50px] font-bold"
      >
        REWIRE
      </text>
      <rect x="312" y="25" width="11" height="11" className="fill-accent" />
      <text
        x="0"
        y="88"
        textLength={LINE_WIDTH}
        lengthAdjust="spacing"
        className="fill-ink-muted font-mono text-[38px] font-bold"
      >
        ELECTRONICS
      </text>
    </svg>
  );
}
