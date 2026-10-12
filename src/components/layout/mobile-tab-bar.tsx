"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "@/components/providers/account-provider";
import { useGetMe } from "@/hooks/use-auth";
import { signInHref } from "@/lib/auth/next-path";
import { ACCOUNT_HOME_PATH, ORDER_TRACK_PAGE_PATH } from "@/lib/constants";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

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
 *
 * ── The profile tab ─────────────────────────────────────────────────
 *
 * Signed in, Account is a link to the account home. Signed out it is a
 * disclosure that owns a small panel rising above the bar, offering
 * sign in and order tracking.
 *
 * The signed-out panel is deliberately tap-only, and deliberately
 * nothing like the desktop nav's hover disclosures:
 *
 *   - hidden on load, always. There is no state, route or breakpoint in
 *     which this opens by itself;
 *   - tapping the icon opens it, tapping the icon again closes it;
 *   - tapping anywhere outside closes it — a scrim covers the rest of
 *     the viewport for exactly that, which also stops the panel from
 *     obscuring a control the reader is trying to reach;
 *   - Escape closes it, matching the drawer and the search panel;
 *   - a route change closes it.
 *
 * The bar itself stays above the scrim and stays tappable, so the
 * dropdown can never trap a reader away from Home.
 */

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon, exact: true },
  { href: SHOP_INDEX_HREF, label: "Categories", icon: GridIcon, exact: false },
  { href: "/wishlist", label: "Wishlist", icon: HeartIcon, exact: false },
] as const;

const PROFILE_MENU_ID = "mobile-profile-menu";

export function MobileTabBar() {
  const pathname = usePathname();
  const { wishlistSlugs } = useAccount();
  const me = useGetMe();
  const signedIn = !me.isPending && Boolean(me.data);
  const [profileOpen, setProfileOpen] = useState(false);

  /* A route change closes the panel — the reader has arrived. */
  useEffect(() => setProfileOpen(false), [pathname]);

  /* Escape closes it, the same key that closes the drawer and search. */
  useEffect(() => {
    if (!profileOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [profileOpen]);

  const profileActive = pathname.startsWith(ACCOUNT_HOME_PATH);
  const menuOpen = profileOpen && !signedIn;

  return (
    <>
      {/* ---------- Dismiss layer ----------
          Sits under the bar but over the page, so a tap anywhere else
          closes the panel instead of activating whatever is beneath.
          `aria-hidden` + no label: Escape and the trigger are the
          accessible ways out. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            aria-hidden
            onClick={() => setProfileOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast }}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>

      <nav
        aria-label="Primary (mobile)"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 md:hidden",
          "border-t border-line bg-[var(--glass-bg-strong)] backdrop-blur-xl backdrop-saturate-150",
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        {/* ---------- Profile dropdown ----------
            Anchored to the bar's top edge and inset to the gutter, so
            it reads as belonging to the icon that opened it rather than
            as a sheet that arrived from somewhere else. */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id={PROFILE_MENU_ID}
              role="menu"
              aria-label="Account"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
              className={cn(
                "absolute inset-x-3 bottom-full mb-3 overflow-hidden rounded-2xl",
                "border border-line bg-surface shadow-(--shadow-float)",
              )}
            >
                <div className="p-4">
                  <p className="text-sm font-medium text-ink">Your account</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Sign in for orders, tracking, saved devices and
                    waitlists.
                  </p>
                  <Link
                    href={signInHref(pathname)}
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className={cn(
                      "mt-4 flex h-11 w-full items-center justify-center rounded-full",
                      "bg-ink text-sm font-medium tracking-tight text-surface",
                      "transition-colors duration-(--duration-fast) hover:bg-ink-hover",
                    )}
                  >
                    Sign in
                  </Link>
                  <Link
                    href={ORDER_TRACK_PAGE_PATH}
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-line text-sm font-medium tracking-tight text-ink transition-colors duration-(--duration-fast) hover:border-ink"
                  >
                    Track Order
                  </Link>
                </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <ActiveDot active={active} />

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

          <li className="flex-1">
            {signedIn ? (
              <Link
                href={ACCOUNT_HOME_PATH}
                aria-current={pathname === ACCOUNT_HOME_PATH ? "page" : undefined}
                className={cn(
                  "relative flex h-full w-full flex-col items-center justify-center gap-1",
                  "transition-colors duration-(--duration-fast)",
                  profileActive ? "text-ink" : "text-ink-muted",
                )}
              >
                <ActiveDot active={profileActive} />
                <PersonIcon className="size-[1.35rem]" />
                <span className="font-mono text-[0.5625rem] uppercase leading-none tracking-[0.14em]">
                  Account
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setProfileOpen((cur) => !cur)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-controls={PROFILE_MENU_ID}
                aria-label={profileOpen ? "Close account menu" : "Open account menu"}
                className={cn(
                  "relative flex h-full w-full flex-col items-center justify-center gap-1",
                  "transition-colors duration-(--duration-fast)",
                  profileActive || profileOpen ? "text-ink" : "text-ink-muted",
                )}
              >
                <ActiveDot active={profileActive || profileOpen} />
                <PersonIcon className="size-[1.35rem]" />
                <span className="font-mono text-[0.5625rem] uppercase leading-none tracking-[0.14em]">
                  Account
                </span>
              </button>
            )}
          </li>
        </ul>
      </nav>
    </>
  );
}

/** The accent dot above an active tab's icon. */
function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-1.5 size-1 rounded-full bg-accent",
        "transition-opacity duration-(--duration-fast)",
        active ? "opacity-100" : "opacity-0",
      )}
    />
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
