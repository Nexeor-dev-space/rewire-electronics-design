"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  categoryNavIsActive,
  editorialNavLink,
  getCategoryNav,
  upcomingDropsLink,
  type CategoryNavItem,
  type MegaMenuId,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { MegaMenu, megaMenuId } from "./mega-menu";
import { CategoryMegaPanel } from "./category-mega-panel";

/**
 * CategoryBar — the secondary product rail below the utility bar.
 *
 * Six items, and only six: Upcoming Drops, the four product families
 * (Smartphones, Laptops, Tablets, Accessories) and About. Every one of
 * them opens a full-width panel anchored to the bar's bottom edge, so
 * the row reads as one system rather than a mix of link lists and mega
 * panels.
 *
 * Reads its data from `getCategoryNav()` (backed by the catalogue), so
 * every submenu here corresponds to real stock. A category link is a
 * direct anchor when it has no dropdown, or a hover/focus disclosure
 * when the catalogue carries more than one brand for it.
 *
 * **Two things were removed, and both were sources of movement.**
 * The separate Support trigger merged into About — see `aboutColumns`
 * in `lib/navigation.ts`. And the `More` overflow bucket went with it:
 * it existed to fold the last two of six categories away below `xl`, so
 * the rail rendered a different number of items on either side of that
 * breakpoint and reshuffled as the window crossed it. Four families and
 * one editorial heading fit inline from `md` at every width, which is
 * the simplest way to guarantee the bar never re-lays itself out.
 *
 * Below `md` the whole bar hides — mobile uses the drawer.
 */

const CLOSE_DELAY = 130;

export function CategoryBar() {
  const pathname = usePathname();
  const items = getCategoryNav();
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(null), CLOSE_DELAY);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);
  useEffect(() => setOpen(null), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <nav
      aria-label="Product categories"
      // `relative` so the Upcoming Drops MegaMenu below can anchor to
      // the full bar width via `absolute inset-x-0 top-full`.
      // Hairline on both edges — the top border separates the category
      // rail from the utility bar above; the bottom border closes the
      // whole header off from the page content beneath, so the chrome
      // reads as one bracketed system rather than trailing into the
      // hero.
      className="relative hidden border-y border-line md:block"
    >
      {/* One centred row. All items — Upcoming Drops, the four families
          and About — share the same measure and centre together rather
          than splitting into a left commerce cluster and a right
          editorial cluster. The row reads as one navigation, not two. */}
      <ul className="mx-auto flex w-full max-w-[110rem] items-stretch justify-center gap-1 px-(--spacing-gutter)">
        {/* Shop was removed from the second bar — the "browse the
            catalogue" affordance now lives inside every mega-panel via
            each panel's own CTA (e.g. "View Upcoming Drops", "Browse
            everything") and inside the category triggers themselves. */}

        {/* ---------- Upcoming Drops — full mega-panel with the release
            calendar, showcase card and Join Waitlist CTA. */}
        <MegaMenuItem
          menuId="drops"
          label={upcomingDropsLink.label}
          href={upcomingDropsLink.href}
          live
          active={pathname === upcomingDropsLink.href}
          open={open === "__drops"}
          onHover={() => {
            cancelClose();
            setOpen("__drops");
          }}
          onLeave={scheduleClose}
          onToggle={() => setOpen(open === "__drops" ? null : "__drops")}
        />

        {/* ---------- The four families — all inline, at every width ---------- */}
        {items.map((item) => (
          <CategoryItem
            key={item.slug}
            item={item}
            active={categoryNavIsActive(pathname, item.slug)}
            open={open === item.slug}
            onHover={() => {
              cancelClose();
              setOpen(item.slug);
            }}
            onLeave={scheduleClose}
            onToggle={() => setOpen(open === item.slug ? null : item.slug)}
          />
        ))}

        {/* ---------- About — the one editorial heading, carrying the
            support box on the panel's right-hand side. */}
        <MegaMenuItem
          menuId="about"
          label={editorialNavLink.label}
          href={editorialNavLink.href}
          active={
            pathname === editorialNavLink.href ||
            pathname.startsWith(`${editorialNavLink.href}/`) ||
            // Every policy the About panel links to is a section of
            // `/support`, so the heading stays lit while the reader is
            // on any of them. Without this, clicking Warranty from the
            // About menu un-highlights the menu it was clicked from.
            pathname.startsWith("/support") ||
            pathname === "/terms" ||
            pathname === "/privacy"
          }
          open={open === "__about"}
          onHover={() => {
            cancelClose();
            setOpen("__about");
          }}
          onLeave={scheduleClose}
          onToggle={() => setOpen(open === "__about" ? null : "__about")}
        />
      </ul>
    </nav>
  );
}

/* ============================================================
   Category item — anchor if no dropdown, disclosure if there are brands
   ============================================================ */

function CategoryItem({
  item,
  active,
  open,
  onHover,
  onLeave,
  onToggle,
  className,
}: {
  item: CategoryNavItem;
  active: boolean;
  open: boolean;
  onHover: () => void;
  onLeave: () => void;
  onToggle: () => void;
  className?: string;
}) {
  const hasDropdown = item.brands.length > 0;
  const triggerId = `${megaMenuId("categories")}-trigger-${item.slug}`;

  // Categories used to open a compact per-category brand list; now they
  // open the same full-width `CategoriesMenu` mega-panel that Upcoming
  // Drops and the editorial triggers use, so the whole second nav
  // reads as one offcanvas system. Per-category brand narrowing lives
  // one click deeper, on the collection page.
  return (
    <li
      className={cn("shrink-0", className)}
      onMouseEnter={hasDropdown ? onHover : undefined}
      onMouseLeave={hasDropdown ? onLeave : undefined}
    >
      {hasDropdown ? (
        <div className="relative inline-flex h-11 items-center">
          <Link
            href={item.href}
            id={triggerId}
            aria-current={active ? "page" : undefined}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={megaMenuId("categories")}
            onFocus={onHover}
            onBlur={onLeave}
            className={cn(
              "inline-flex h-full items-center pl-3 pr-1 text-[0.8125rem] font-medium tracking-tight",
              "transition-colors duration-(--duration-fast)",
              active || open ? "text-ink" : "text-ink-secondary hover:text-ink",
            )}
          >
            {item.label}
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={`${item.label} menu`}
            aria-controls={megaMenuId("categories")}
            onClick={onToggle}
            onFocus={onHover}
            onBlur={onLeave}
            className="inline-flex h-full items-center pr-3 text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink"
          >
            <Chevron open={open} />
          </button>
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-ink transition-transform duration-(--duration-fast) ease-(--ease-out-quart)",
              (active || open) && "scale-x-100",
            )}
          />
        </div>
      ) : (
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative inline-flex h-11 items-center px-3 text-[0.8125rem] font-medium tracking-tight",
            "transition-colors duration-(--duration-fast)",
            active ? "text-ink" : "text-ink-secondary hover:text-ink",
          )}
        >
          {item.label}
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-ink transition-transform duration-(--duration-fast) ease-(--ease-out-quart)",
              active && "scale-x-100",
            )}
          />
        </Link>
      )}

      <AnimatePresence>
        {hasDropdown && open && (
          <CategoryMegaPanel
            item={item}
            labelledBy={triggerId}
            onPointerEnter={onHover}
          />
        )}
      </AnimatePresence>
    </li>
  );
}

/* ============================================================
   Chevron — one small SVG shared by every disclosure
   ============================================================ */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-3 shrink-0 transition-transform duration-(--duration-fast) ease-(--ease-out-quart)",
        open && "rotate-180",
      )}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

/* ============================================================
   MegaMenuItem — the shared offcanvas-style bar item.
   ============================================================

   One nav trigger that opens a full-width `MegaMenu` panel matching
   the Upcoming Drops shape (rich, image-led, anchored to the bar's
   bottom edge). Used for Drops, categories, About and Support so the
   second nav reads as one system of dropdowns rather than a mix of
   compact link lists and mega panels. */

function MegaMenuItem({
  menuId,
  label,
  href,
  active,
  open,
  live,
  className,
  onHover,
  onLeave,
  onToggle,
}: {
  menuId: MegaMenuId;
  label: string;
  href: string;
  active: boolean;
  open: boolean;
  live?: boolean;
  className?: string;
  onHover: () => void;
  onLeave: () => void;
  onToggle: () => void;
}) {
  const triggerId = `${megaMenuId(menuId)}-trigger`;
  return (
    <li
      className={cn("shrink-0", className)}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div
        className={cn(
          "group/link relative inline-flex h-11 items-center",
          "text-[0.8125rem] font-medium tracking-tight",
          active || open ? "text-ink" : "text-ink-secondary",
        )}
      >
        <Link
          href={href}
          id={triggerId}
          aria-current={active ? "page" : undefined}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={megaMenuId(menuId)}
          onFocus={onHover}
          onBlur={onLeave}
          className={cn(
            "inline-flex h-full items-center gap-2 pl-3 pr-1",
            "transition-colors duration-(--duration-fast) hover:text-ink",
          )}
        >
          {label}
          {live && (
            <span
              aria-hidden
              className="size-1.5 animate-pulse-dot rounded-full bg-live"
            />
          )}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`${label} menu`}
          aria-controls={megaMenuId(menuId)}
          onClick={onToggle}
          onFocus={onHover}
          onBlur={onLeave}
          className="inline-flex h-full items-center pr-3 transition-colors duration-(--duration-fast) hover:text-ink"
        >
          <Chevron open={open} />
        </button>
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-ink transition-transform duration-(--duration-fast) ease-(--ease-out-quart)",
            (active || open) && "scale-x-100",
          )}
        />
      </div>

      <AnimatePresence>
        {open && (
          <MegaMenu
            id={menuId}
            labelledBy={triggerId}
            onPointerEnter={onHover}
            onJoinWaitlist={() => {}}
          />
        )}
      </AnimatePresence>
    </li>
  );
}
