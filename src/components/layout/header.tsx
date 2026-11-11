"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { searchCopy, searchHref } from "@/lib/site";
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
import { Logo } from "./logo";
import { useNavigation } from "@/components/providers/navigation-provider";

/**
 * Header — the site's persistent chrome, two levels deep.
 *
 * Row 1 (all widths): logo · centered search · account · cart
 *   Below `md` the mobile bar folds: hamburger · logo · search icon.
 *   Below `lg` the cart moves to the bottom tab bar (`MobileTabBar`).
 *   The hamburger itself stays to `lg`, because the category rail only
 *   appears from `lg` — tablets reach navigation through `MobileDrawer`.
 * Row 2 (from `lg`): the category rail (`CategoryBar`) — real e-commerce
 *   navigation into `/collection/*` with brand-filtered submenus. It starts
 *   at `lg` to match its mega panels, which are `lg:block`; at `md` the rail
 *   overflowed its centred flex row and clipped the first item off-screen.
 *
 * Both rows share one hairline surface and one scroll-hide behaviour, so
 * they read as a single chrome, not two competing bars. The search field
 * is the row's centrepiece and the real input from `md`: typing there opens
 * `SearchPanel` with suggestions only. Below `md` the search icon opens the
 * panel with its own field. Either way exactly one field is on screen.
 */

export function Header() {
  const { scrolled, scrollingDown } = useScrollState();
  const { topBar } = useNavigation().header;
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
          <div className="mx-auto flex h-16 max-w-[110rem] items-center gap-3 px-(--spacing-gutter) max-[22rem]:gap-1 md:h-[4.5rem] md:gap-5 lg:gap-8">
            {/* Mobile: hamburger sits before the logo. */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors duration-(--duration-fast) hover:bg-white/[0.05] lg:hidden"
            >
              <span aria-hidden className="relative block h-2.5 w-5">
                <span className="absolute left-0 top-0 h-px w-full bg-current" />
                <span className="absolute bottom-0 left-0 h-px w-full bg-current" />
              </span>
            </button>

            {topBar.map((part) => {
              switch (part.id) {
                case "logo":
                  return <Logo key={part.id} />;
                case "search":
                  return (
                    <Fragment key={part.id}>
                      {/* Inline search, visually centred on desktop: from `md` the
                          field takes the free space between its neighbours. */}
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
                    </Fragment>
                  );
                case "account":
                  /* Hidden below `md` on purpose: mobile reaches it through the drawer. */
                  return (
                    <div key={part.id} className="hidden shrink-0 md:block">
                      <AccountMenu />
                    </div>
                  );
                case "cart":
                  /* Below `lg` the cart sits in the bottom tab bar instead. */
                  return <CartButton key={part.id} className="hidden shrink-0 lg:flex" />;
              }
            })}
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

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className="fixed inset-0 z-40 bg-void/85 backdrop-blur-md"
          />
        )}
      </AnimatePresence>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenSearch={openSearch}
        isActive={isActive}
      />
    </>
  );
}
