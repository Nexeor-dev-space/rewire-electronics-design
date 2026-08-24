"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { siteConfig } from "@/lib/site";
import {
  primaryNav,
  type MegaMenuId,
  type PrimaryNavItem,
} from "@/lib/navigation";
import { useScrollState } from "@/hooks/use-scroll-state";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { WaitlistModal } from "@/components/home/hero/waitlist-modal";
import { MegaMenu, megaMenuId } from "./mega-menu";
import { SearchPanel, SEARCH_PANEL_ID } from "./search-panel";
import { MobileDrawer } from "./mobile-drawer";
import { CartButton } from "./cart-button";
import { AccountMenu } from "./account-menu";

/** Grace period so the pointer can cross the gap into an open panel. */
const CLOSE_DELAY = 130;

/**
 * Header — the site's one piece of persistent chrome.
 *
 * Three zones from `lg` up: wordmark, the primary links centred, then
 * search and the drop CTA. Below `lg` the links collapse to a drawer.
 * Transparent over the hero, settling to glass with a hairline once
 * scrolled, and retreating on downward scroll — but never while a
 * panel, the search, or the drawer is open.
 */
export function Header() {
  const { scrolled, scrollingDown } = useScrollState();
  const pathname = usePathname();

  const [openPanel, setOpenPanel] = useState<MegaMenuId | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const closeTimer = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  const anyOverlayOpen = searchOpen || drawerOpen || waitlistOpen;

  /* Close everything on navigation. */
  useEffect(() => {
    setOpenPanel(null);
    setDrawerOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  /* Hover intent — a panel shouldn't vanish while the pointer travels to it. */
  const cancelClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(
      () => setOpenPanel(null),
      CLOSE_DELAY,
    );
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  /* Escape closes an open panel; the overlays handle their own. */
  useEffect(() => {
    if (!openPanel) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openPanel]);

  const isActive = useCallback(
    (href: string) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href),
    [pathname],
  );

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{
          y: scrollingDown && !anyOverlayOpen && !openPanel ? "-100%" : "0%",
        }}
        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      >
        {/* `relative` anchors the search panel to the bar's bottom edge.
            With search open the bar drops the glass for flat `void` so the
            bar and the panel read as one continuous surface. */}
        <div
          onMouseLeave={scheduleClose}
          className={cn(
            "relative border-b transition-[background-color,border-color,backdrop-filter,box-shadow] duration-(--duration-base)",
            searchOpen
              ? "border-line bg-void"
              : scrolled && !drawerOpen
                ? "border-line bg-[var(--glass-bg)] shadow-[0_8px_24px_rgb(20_20_25/0.04)] backdrop-blur-xl backdrop-saturate-150"
                : "border-transparent bg-transparent",
          )}
        >
          <div className="mx-auto flex h-16 max-w-[110rem] items-center gap-6 px-(--spacing-gutter) md:h-20">
            {/* ---------- Wordmark ---------- */}
            <Link
              href="/"
              aria-label={`${siteConfig.name} — home`}
              className="-my-2 shrink-0 py-2 transition-opacity duration-(--duration-fast) hover:opacity-70"
            >
              <span className="block text-base font-medium leading-none tracking-[0.32em] text-ink">
                REWIRE<span className="text-accent">.</span>
              </span>
              <span className="mt-1 hidden font-mono text-[0.75rem] uppercase leading-none tracking-[0.42em] text-ink-muted sm:block">
                Electronics
              </span>
            </Link>

            {/* ---------- Primary links (lg and up) ---------- */}
            <nav
              ref={navRef}
              aria-label="Primary"
              className="hidden flex-1 justify-center lg:flex"
              onBlur={(event) => {
                if (!navRef.current?.contains(event.relatedTarget as Node)) {
                  setOpenPanel(null);
                }
              }}
            >
              <ul className="flex items-center gap-1">
                {primaryNav.map((item) => (
                  <NavBarItem
                    key={item.label}
                    item={item}
                    active={isActive(item.href)}
                    open={!!item.menu && openPanel === item.menu}
                    onOpen={() => {
                      cancelClose();
                      if (item.menu) setOpenPanel(item.menu);
                    }}
                  />
                ))}
              </ul>
            </nav>

            {/* ---------- Utilities: search · cart · account ---------- */}
            <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
              <button
                ref={searchTriggerRef}
                type="button"
                onClick={() => setSearchOpen((cur) => !cur)}
                aria-label="Search certified devices"
                aria-expanded={searchOpen}
                aria-controls={SEARCH_PANEL_ID}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full transition-colors duration-(--duration-fast)",
                  searchOpen
                    ? "bg-ink/5 text-ink"
                    : "text-ink-secondary hover:bg-ink/5 hover:text-ink",
                )}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="size-[1.15rem]"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16.5 16.5L21 21" />
                </svg>
              </button>

              <AccountMenu />

              <CartButton />

              {/* Hairline between the utilities and the one CTA — the only
                  rule in the bar, and the thing that keeps four controls
                  from reading as one undifferentiated row. */}
              <span
                aria-hidden
                className="mx-2 hidden h-5 w-px bg-line lg:block"
              />

              <button
                type="button"
                onClick={() => setWaitlistOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={waitlistOpen}
                className={cn(
                  "hidden h-10 items-center gap-2.5 rounded-full px-5 lg:inline-flex",
                  "bg-ink text-[0.8125rem] font-medium tracking-tight text-surface",
                  "transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
                  "hover:bg-ink-hover active:scale-[0.97]",
                )}
              >
                Join Waitlist
              </button>

              {/* Hamburger — below lg only */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                aria-haspopup="dialog"
                aria-expanded={drawerOpen}
                className="flex size-10 items-center justify-center rounded-full text-ink transition-colors duration-(--duration-fast) hover:bg-ink/5 lg:hidden"
              >
                <span aria-hidden className="relative block h-2.5 w-5">
                  <span className="absolute left-0 top-0 h-px w-full bg-current" />
                  <span className="absolute bottom-0 left-0 h-px w-full bg-current" />
                </span>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {openPanel && (
              <MegaMenu
                id={openPanel}
                labelledBy={navLabelId(openPanel)}
                onPointerEnter={cancelClose}
                onJoinWaitlist={() => {
                  setOpenPanel(null);
                  setWaitlistOpen(true);
                }}
              />
            )}
          </AnimatePresence>

          <SearchPanel
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            triggerRef={searchTriggerRef}
          />
        </div>
      </motion.header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onJoinWaitlist={() => setWaitlistOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        isActive={isActive}
      />

      {/* Navbar entry — general waitlist. No `preselect`: the modal
          opens with device + variant selects because the shopper has
          not named a product from this surface. */}
      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </>
  );
}

/* ============================================================
   One item in the bar — a link, or a trigger for a mega menu
   ============================================================ */

/** Ties a trigger to its panel for `aria-labelledby`. */
export function navLabelId(menu: MegaMenuId) {
  return `nav-trigger-${menu}`;
}

function NavBarItem({
  item,
  active,
  open,
  onOpen,
}: {
  item: PrimaryNavItem;
  active: boolean;
  open: boolean;
  onOpen: () => void;
}) {
  const label = (
    <>
      {item.label}
      {item.badge === "live" && (
        <span
          aria-hidden
          className="ml-2 inline-block size-1.5 animate-pulse-dot rounded-full bg-live align-middle"
        />
      )}
      {/* One rule serves three states: solid when current, drawn in on
          hover, and held open while this item's menu is showing. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-3.5 bottom-1.5 h-px origin-left bg-ink",
          "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
          active || open
            ? "scale-x-100"
            : "scale-x-0 group-hover/nav:scale-x-100 group-focus-visible/nav:scale-x-100",
        )}
      />
    </>
  );

  const shared = cn(
    "group/nav relative inline-flex items-center rounded-md px-3.5 py-2.5",
    "text-[0.8125rem] font-medium tracking-tight transition-colors duration-(--duration-fast)",
    active || open ? "text-ink" : "text-ink-secondary hover:text-ink",
  );

  if (!item.menu) {
    return (
      <li>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={shared}
        >
          {label}
        </Link>
      </li>
    );
  }

  // No `onMouseLeave` here — the whole bar owns closing, so the pointer can
  // travel from a trigger down into the panel without the menu vanishing.
  //
  // The trigger is a `Link`, not a `button`: clicking About should go to the
  // About page, clicking Shop should open the shop index. The mega panel is
  // supplementary — it opens on hover (pointer-enter) and on keyboard focus,
  // but never blocks navigation. On touch, users get the same behaviour
  // (tap navigates); the mobile drawer covers small-screen category browsing
  // separately, so no one loses access to the sub-links.
  return (
    <li onPointerEnter={onOpen}>
      <Link
        href={item.href}
        id={navLabelId(item.menu)}
        onFocus={onOpen}
        aria-current={active ? "page" : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={megaMenuId(item.menu)}
        className={shared}
      >
        {label}
      </Link>
    </li>
  );
}
