import type { ComponentType } from "react";
import type { MobileTabIcon } from "@/types/navigation";
import { CartIcon } from "./cart-button";
import { GridIcon } from "./categories-popup";

/**
 * The icons a mobile bar tab can use. Thin line, `currentColor`, 24 grid.
 * Staff pick one by name (`MobileTabIcon`); add a name there and an entry
 * here to offer another.
 */

type IconProps = { className?: string };

function Glyph({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5h4.5V14h3v5.5H18V10" />
    </Glyph>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 20.25S4.25 15.6 4.25 9.9A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.75 1.9c0 5.7-7.75 10.35-7.75 10.35Z" />
    </Glyph>
  );
}

export function PersonIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M4.75 19.5c1.4-3.6 4.1-5.4 7.25-5.4s5.85 1.8 7.25 5.4" />
    </Glyph>
  );
}

function DropsIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </Glyph>
  );
}

function InfoIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Glyph>
  );
}

function SupportIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M5 6.5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
    </Glyph>
  );
}

function TagIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M4.5 12.5V5.5a1 1 0 0 1 1-1h7l7 7-8 8-7-7Z" />
      <path d="M8.5 8.5h.01" />
    </Glyph>
  );
}

export const MOBILE_TAB_ICON_COMPONENTS: Record<MobileTabIcon, ComponentType<IconProps>> = {
  home: HomeIcon,
  categories: GridIcon,
  cart: CartIcon,
  wishlist: HeartIcon,
  account: PersonIcon,
  drops: DropsIcon,
  info: InfoIcon,
  support: SupportIcon,
  tag: TagIcon,
};
