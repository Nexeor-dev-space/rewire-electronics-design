"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "@/components/providers/account-provider";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { cn } from "@/lib/utils";

/**
 * MobileTabBar — the phone's persistent bottom navigation.
 *
 * Fixed to the viewport foot below `md`; hidden entirely from `md` up,
 * where the header's category rail and utility cluster carry the same
 * destinations. Four tabs, the e-commerce canon: Home, Categories (the
 * shop index), Wishlist, and Account. Cart is deliberately absent — it
 * already sits in the top bar on every width, and repeating it here
 * would spend a tab on a control the thumb can already reach.
 *
 * Active state is a colour shift plus a small accent dot above the
 * icon — colour alone would fail the "not colour alone" rule the site
 * holds for state elsewhere. The wishlist tab carries a count badge
 * when anything is saved, mirroring the cart button's pattern.
 *
 * The bar pads itself with `env(safe-area-inset-bottom)` so the tabs
 * clear the iOS home indicator, and `SiteLayout` gives `<main>` a
 * matching bottom pad below `md` so no page ends underneath the bar.
 */

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon, exact: true },
  { href: SHOP_INDEX_HREF, label: "Categories", icon: GridIcon, exact: false },
  { href: "/wishlist", label: "Wishlist", icon: HeartIcon, exact: false },
  { href: "/account", label: "Account", icon: PersonIcon, exact: false },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const { wishlistSlugs } = useAccount();

  return (
    <nav
      aria-label="Primary (mobile)"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t border-line bg-[var(--glass-bg-strong)] backdrop-blur-xl backdrop-saturate-150",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="flex h-16 items-stretch">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          const badge =
            tab.label === "Wishlist" && wishlistSlugs.length > 0
              ? wishlistSlugs.length
              : undefined;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1",
                  "transition-colors duration-(--duration-fast)",
                  active ? "text-ink" : "text-ink-muted",
                )}
              >
                {/* Active marker — a dot above the icon, so state is
                    carried by shape as well as colour. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1.5 size-1 rounded-full bg-accent",
                    "transition-opacity duration-(--duration-fast)",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />

                <span className="relative">
                  <Icon className="size-[1.35rem]" />
                  {badge !== undefined && (
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[0.5625rem] leading-4 tabular-nums text-white"
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>

                <span className="font-mono text-[0.5625rem] uppercase leading-none tracking-[0.14em]">
                  {tab.label}
                  {badge !== undefined && (
                    <span className="sr-only">, {badge} saved</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- Icons — thin-line, currentColor ---------- */

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5h4.5V14h3v5.5H18V10" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 20.25S4.25 15.6 4.25 9.9A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.75 1.9c0 5.7-7.75 10.35-7.75 10.35Z" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M4.75 19.5c1.4-3.6 4.1-5.4 7.25-5.4s5.85 1.8 7.25 5.4" />
    </svg>
  );
}
