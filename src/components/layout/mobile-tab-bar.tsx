"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "@/components/providers/account-provider";
import { useGetMe } from "@/hooks/use-auth";
import { signInHref } from "@/lib/auth/next-path";
import { useGetCart } from "@/hooks/use-cart";
import { useNavigation } from "@/components/providers/navigation-provider";
import {
  ACCOUNT_HOME_PATH,
  CART_PAGE_PATH,
  CATEGORIES_TAB_HREF,
  ORDER_TRACK_PAGE_PATH,
  WISHLIST_PAGE_PATH,
} from "@/lib/constants";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import type { MobileTab } from "@/types/navigation";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { CategoriesDialog } from "./categories-popup";
import { MOBILE_TAB_ICON_COMPONENTS } from "./nav-icons";

/**
 * MobileTabBar — the phone's persistent bottom navigation.
 *
 * Fixed to the viewport foot below `lg` (phones and smaller tablets);
 * hidden from `lg` up, where the header's category rail and utility
 * cluster carry the same destinations. Five tabs: Home, Categories,
 * Cart, Wishlist and Account.
 *
 * Cart lives here, not in the top bar, below `lg`: the header hides its
 * cart button at those widths and the thumb reaches the bag from the
 * foot of the screen while scrolling. Its badge is the live cart count
 * from `useGetCart`, the same source the desktop cart button reads.
 *
 * Categories is a button, not a link: it opens `CategoriesDialog`, the
 * same category list the desktop rail's Categories popup shows.
 *
 * Active state is a colour shift plus a small accent dot above the
 * icon — colour alone would fail the "not colour alone" rule the site
 * holds for state elsewhere. Cart and Wishlist carry a count badge.
 *
 * The bar pads itself with `env(safe-area-inset-bottom)` so the tabs
 * clear the iOS home indicator, and `SiteLayout` gives the footer a
 * matching bottom pad below `lg` so no page ends underneath the bar.
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


const PROFILE_MENU_ID = "mobile-profile-menu";

export function MobileTabBar() {
  const pathname = usePathname();
  const { tabs } = useNavigation().mobileBar;
  const { wishlistSlugs } = useAccount();
  const cart = useGetCart();
  const cartCount = cart.isPending ? 0 : (cart.data?.itemCount ?? 0);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const me = useGetMe();
  const signedIn = !me.isPending && Boolean(me.data);
  const [profileOpen, setProfileOpen] = useState(false);

  /* A route change closes the panel — the reader has arrived. */
  useEffect(() => {
    setProfileOpen(false);
    setCategoriesOpen(false);
  }, [pathname]);

  /* Escape closes it, the same key that closes the drawer and search. */
  useEffect(() => {
    if (!profileOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [profileOpen]);

  if (tabs.length === 0) return null;

  const profileActive = pathname.startsWith(ACCOUNT_HOME_PATH);
  const menuOpen = profileOpen && !signedIn;

  /* Cart, Wishlist, Account and Categories keep their behaviour wherever
     staff place them: it follows the tab's link, not its position. */
  function renderTab(tab: MobileTab) {
    const Icon = MOBILE_TAB_ICON_COMPONENTS[tab.icon];

    if (tab.href === CATEGORIES_TAB_HREF) {
      const active = categoriesOpen || pathname.startsWith(SHOP_INDEX_HREF);
      return (
        <button
          type="button"
          onClick={() => setCategoriesOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={categoriesOpen}
          className={cn(TAB_CLASS, active ? "text-ink" : "text-ink-muted")}
        >
          <ActiveDot active={active} />
          <Icon className="size-[1.35rem]" />
          <TabLabel>{tab.label}</TabLabel>
        </button>
      );
    }

    if (tab.href === ACCOUNT_HOME_PATH) {
      if (signedIn) {
        return (
          <Link
            href={ACCOUNT_HOME_PATH}
            aria-current={pathname === ACCOUNT_HOME_PATH ? "page" : undefined}
            className={cn(TAB_CLASS, profileActive ? "text-ink" : "text-ink-muted")}
          >
            <ActiveDot active={profileActive} />
            <Icon className="size-[1.35rem]" />
            <TabLabel>{tab.label}</TabLabel>
          </Link>
        );
      }
      return (
        <button
          type="button"
          onClick={() => setProfileOpen((cur) => !cur)}
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          aria-controls={PROFILE_MENU_ID}
          aria-label={profileOpen ? "Close account menu" : "Open account menu"}
          className={cn(TAB_CLASS, profileActive || profileOpen ? "text-ink" : "text-ink-muted")}
        >
          <ActiveDot active={profileActive || profileOpen} />
          <Icon className="size-[1.35rem]" />
          <TabLabel>{tab.label}</TabLabel>
        </button>
      );
    }

    const path = tab.href.split("#")[0];
    const isCart = path === CART_PAGE_PATH;
    const isWishlist = path === WISHLIST_PAGE_PATH;
    const badge = isCart ? cartCount : isWishlist ? wishlistSlugs.length : 0;
    return (
      <TabLink
        href={tab.href}
        label={tab.label}
        icon={Icon}
        active={path === "/" ? pathname === "/" : pathname.startsWith(path)}
        badge={badge}
        badgeNoun={isCart ? (cartCount === 1 ? "item" : "items") : "saved"}
      />
    );
  }

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
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      <nav
        aria-label="Primary (mobile)"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 lg:hidden",
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
          {tabs.map((tab) => (
            <li key={tab.id} className="flex-1">
              {renderTab(tab)}
            </li>
          ))}
        </ul>
      </nav>

      <CategoriesDialog open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </>
  );
}

const TAB_CLASS = cn(
  "relative flex h-full w-full flex-col items-center justify-center gap-1",
  "transition-colors duration-(--duration-fast)",
);

function TabLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="max-w-full truncate font-mono text-[0.5625rem] uppercase leading-none tracking-[0.14em] max-[22rem]:sr-only">
      {children}
    </span>
  );
}

/** A link tab, with an optional count badge on its icon. */
function TabLink({
  href,
  label,
  icon: Icon,
  active,
  badge = 0,
  badgeNoun,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  badge?: number;
  badgeNoun?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(TAB_CLASS, active ? "text-ink" : "text-ink-muted")}
    >
      {/* Active marker — a dot above the icon, so state is
          carried by shape as well as colour. */}
      <ActiveDot active={active} />

      <span className="relative">
        <Icon className="size-[1.35rem]" />
        {badge > 0 && (
          <span
            aria-hidden
            className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[0.5625rem] leading-4 tabular-nums text-white"
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>

      <TabLabel>
        {label}
        {badge > 0 && <span className="sr-only">, {badge} {badgeNoun}</span>}
      </TabLabel>
    </Link>
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
