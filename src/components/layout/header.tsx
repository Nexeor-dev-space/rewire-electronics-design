"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { searchCopy, searchHref, siteConfig } from "@/lib/site";
import { useScrollState } from "@/hooks/use-scroll-state";
import { cn } from "@/lib/utils";
import { SEARCH_MIN_QUERY_LENGTH } from "@/lib/constants";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { SearchPanel, SEARCH_PANEL_ID } from "./search-panel";
import { MobileDrawer } from "./mobile-drawer";
import { CartButton } from "./cart-button";
import { AccountMenu } from "./account-menu";
import { InlineSearch } from "./inline-search";
import { CategoryBar } from "./category-bar";

/**
 * Header — the site's persistent chrome, two levels deep.
 *
 * Row 1 (all widths): logo · centered search · account · cart
 *   Below `md` the mobile bar folds: hamburger · logo · search icon · cart.
 * Row 2 (from `md`): the category rail (`CategoryBar`) — real e-commerce
 *   navigation into `/collection/*` with brand-filtered submenus.
 *
 * Both rows share one hairline surface and one scroll-hide behaviour, so
 * they read as a single chrome, not two competing bars. The search field
 * is the row's centrepiece and the real input from `md`: typing there opens
 * `SearchPanel` with suggestions only. Below `md` the search icon opens the
 * panel with its own field. Either way exactly one field is on screen.
 */

export function Header() {
  const { scrolled, scrollingDown } = useScrollState();
  const pathname = usePathname();

  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** One query for the inline field and the panel. */
  const [query, setQuery] = useState("");
  /** Which control opened search: the inline field is itself the input. */
  const [searchFrom, setSearchFrom] = useState<"inline" | "icon">("icon");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchIconRef = useRef<HTMLButtonElement>(null);

  /**
   * The panel only shows matches, so from the inline field it stays shut
   * until a query is long enough. From the icon it opens at once: it holds
   * the only field on small screens.
   */
  const panelOpen =
    searchOpen && (searchFrom === "icon" || query.trim().length >= SEARCH_MIN_QUERY_LENGTH);

  const anyOverlayOpen = panelOpen || drawerOpen;

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
  }, []);

  /* Close overlays on navigation. */
  useEffect(() => {
    setDrawerOpen(false);
    closeSearch();
  }, [pathname, closeSearch]);

  /* Global Escape closes overlays — the search panel handles its own too. */
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeSearch]);

  const openSearch = useCallback(() => {
    setSearchFrom("icon");
    setSearchOpen(true);
  }, []);

  const openInlineSearch = useCallback(() => {
    setSearchFrom("inline");
    setSearchOpen(true);
  }, []);

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
          y: scrollingDown && !anyOverlayOpen ? "-100%" : "0%",
        }}
        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      >
        {/* One surface, two rows. With search open the bar drops the
            glass for flat `void` so the bar and the overlay panel read
            as one continuous surface. */}
        <div
          className={cn(
            "transition-[background-color,border-color,backdrop-filter,box-shadow] duration-(--duration-base)",
            "border-b",
            panelOpen
              ? "border-line bg-void"
              : scrolled && !drawerOpen
                ? "border-line bg-[var(--glass-bg)] shadow-[0_8px_24px_rgb(0_0_0/0.24)] backdrop-blur-xl backdrop-saturate-150"
                : "border-transparent bg-void/70 backdrop-blur-md",
          )}
        >
          {/* ---------- Row 1 — utility bar ---------- */}
          <div className="mx-auto flex h-16 max-w-[110rem] items-center gap-3 px-(--spacing-gutter) md:h-[4.5rem] md:gap-5 lg:gap-8">
            {/* Mobile: hamburger sits before the logo. */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors duration-(--duration-fast) hover:bg-white/[0.05] md:hidden"
            >
              <span aria-hidden className="relative block h-2.5 w-5">
                <span className="absolute left-0 top-0 h-px w-full bg-current" />
                <span className="absolute bottom-0 left-0 h-px w-full bg-current" />
              </span>
            </button>

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

            {/* ---------- Inline search — visually centred on desktop ----------
                From `md` the field takes over the middle of the row.
                Wrapping in `mx-auto flex-1 max-w-*` makes the input
                grow to fill the free space while staying centred
                between the logo and the utility cluster. */}
            <div className="mx-auto hidden max-w-2xl flex-1 md:block">
              <InlineSearch
                ref={searchInputRef}
                value={query}
                onFocus={openInlineSearch}
                onChange={(value) => {
                  setQuery(value);
                  openInlineSearch();
                }}
                onSubmit={() => {
                  if (!query.trim()) return;
                  router.push(searchHref(query));
                  closeSearch();
                }}
                ariaExpanded={panelOpen}
                ariaControls={SEARCH_PANEL_ID}
              />
            </div>

            {/* Mobile: search as an icon that opens the overlay. */}
            <button
              ref={searchIconRef}
              type="button"
              onClick={openSearch}
              aria-label={searchCopy.label}
              aria-expanded={panelOpen}
              aria-controls={SEARCH_PANEL_ID}
              className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-white/[0.05] hover:text-ink md:hidden"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="size-[1.15rem]"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5L21 21" />
              </svg>
            </button>

            {/* ---------- Right utility cluster — account · cart ----------
                Account is hidden below `md` on purpose: mobile reaches
                it through the drawer, so the top bar keeps to logo /
                search / cart and the row never gets crowded. */}
            <div className="flex shrink-0 items-center gap-1 md:gap-2">
              <div className="hidden md:block">
                <AccountMenu />
              </div>
              <CartButton />
            </div>
          </div>

          {/* ---------- Row 2 — category rail (md+) ---------- */}
          <CategoryBar />

          {/* Search overlay is anchored to the whole bar, not one
              trigger, so it drops beneath the second row too — reading
              as an extension of the chrome, not a floating dialog. */}
          <SearchPanel
            open={panelOpen}
            onClose={closeSearch}
            triggerRef={searchFrom === "inline" ? searchInputRef : searchIconRef}
            query={query}
            onQueryChange={setQuery}
            showField={searchFrom === "icon"}
          />
        </div>
      </motion.header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onJoinWaitlist={() => {
          /* Waitlist entry removed from the top bar — the drawer's
             own footer CTA still opens it via the modal mounted by
             the sections that need it. */
        }}
        onOpenSearch={openSearch}
        isActive={isActive}
      />
    </>
  );
}
