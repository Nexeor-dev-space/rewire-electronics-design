"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  aboutMenuLinks,
  categoryNavIsActive,
  editorialNavLinks,
  getCategoryNav,
  shopIndexLink,
  supportMenuLinks,
  upcomingDropsLink,
  type CategoryNavItem,
  type MegaMenuId,
  type MenuLink,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { MegaMenu, megaMenuId } from "./mega-menu";
import { CategoryMegaPanel } from "./category-mega-panel";

/**
 * CategoryBar — the secondary product rail below the utility bar.
 *
 * Reads its data from `getCategoryNav()` (backed by the catalogue), so
 * every submenu here corresponds to real stock. `Shop` is a plain link
 * to the collection index; every category link is a direct anchor when
 * it has no dropdown, or a hover/focus disclosure when the catalogue
 * carries more than one brand for it — in which case the dropdown lists
 * those brands and only those brands, deep-linking into the shop's own
 * `?brand=` filter.
 *
 * Overflow discipline: from `xl` the whole rail lays out inline; from
 * `lg` the last two categories fold into a `More` dropdown so the row
 * never wraps; below `md` the whole bar hides — mobile uses the drawer.
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

  // Split into an always-visible head and an overflow tail folded into
  // a "More" dropdown on tighter widths. Order stays deterministic —
  // Phones / Laptops / Tablets / Audio in view, Wearables / Accessories
  // in More — so the layout never reshuffles between viewports.
  const HEAD_COUNT = 4;
  const head = items.slice(0, HEAD_COUNT);
  const tail = items.slice(HEAD_COUNT);

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
      {/* One centred row. All items — Shop, Upcoming Drops, categories,
          About, Support — share the same measure and centre together
          rather than splitting into a left commerce cluster and a right
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

        {/* ---------- Head categories — visible from md ---------- */}
        {head.map((item) => (
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

        {/* ---------- Tail — inline from xl+, folded into More below xl ---------- */}
        {tail.map((item) => (
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
            className="hidden xl:list-item"
          />
        ))}

        {tail.length > 0 && (
          <MoreItem
            items={tail}
            open={open === "__more"}
            onHover={() => {
              cancelClose();
              setOpen("__more");
            }}
            onLeave={scheduleClose}
            onToggle={() => setOpen(open === "__more" ? null : "__more")}
            className="xl:hidden"
          />
        )}

        {/* ---------- About & Support — full mega-panels ---------- */}
        <MegaMenuItem
          className="hidden md:list-item"
          menuId="about"
          label="About"
          href={editorialNavLinks[0].href}
          active={
            pathname === editorialNavLinks[0].href ||
            pathname.startsWith(`${editorialNavLinks[0].href}/`)
          }
          open={open === "__about"}
          onHover={() => {
            cancelClose();
            setOpen("__about");
          }}
          onLeave={scheduleClose}
          onToggle={() => setOpen(open === "__about" ? null : "__about")}
        />
        <MegaMenuItem
          className="hidden md:list-item"
          menuId="support"
          label="Support"
          href={editorialNavLinks[1].href}
          active={
            pathname === editorialNavLinks[1].href ||
            pathname.startsWith(`${editorialNavLinks[1].href}/`)
          }
          open={open === "__support"}
          onHover={() => {
            cancelClose();
            setOpen("__support");
          }}
          onLeave={scheduleClose}
          onToggle={() => setOpen(open === "__support" ? null : "__support")}
        />
      </ul>
    </nav>
  );
}

/* ============================================================
   LinkListItem — a disclosure rail item that opens a compact link
   list. Shared by Upcoming Drops, About and Support so the three
   dropdowns render as one language, not three.
   ============================================================ */

interface LinkListItemProps {
  label: string;
  /** The trigger's own destination when the shopper clicks the label. */
  triggerHref: string;
  links: MenuLink[];
  active: boolean;
  open: boolean;
  onHover: () => void;
  onLeave: () => void;
  onToggle: () => void;
  /** Live status dot beside the label, used by Upcoming Drops. */
  live?: boolean;
  /**
   * Which edge of the trigger the menu aligns to. `left` for items on
   * the left cluster (Upcoming Drops); `right` for the right-side
   * editorial links (About, Support) so the menu never overflows the
   * viewport edge.
   */
  menuAlign?: "left" | "right";
  className?: string;
}

function LinkListItem({
  label,
  triggerHref,
  links,
  active,
  open,
  onHover,
  onLeave,
  onToggle,
  live,
  menuAlign = "left",
  className,
}: LinkListItemProps) {
  return (
    <li
      className={cn("relative shrink-0", className)}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Split trigger: the label itself is a real Link (so a click or
          keyboard activation always goes to the trigger's page), and
          the chevron is a separate button that only manages disclosure.
          This mirrors the pattern real e-commerce navs use so a user
          who prefers keyboard can reach the destination without
          learning the dropdown's semantics. */}
      <div
        className={cn(
          "group/link relative inline-flex h-11 items-center rounded-none",
          "text-[0.8125rem] font-medium tracking-tight",
          active || open ? "text-ink" : "text-ink-secondary",
        )}
      >
        <Link
          href={triggerHref}
          aria-current={active ? "page" : undefined}
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
          <motion.div
            role="menu"
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
            className={cn(
              "absolute top-full z-40 mt-2 rounded-2xl p-2",
              // Softer ground: elevated graphite + a hairline top-edge
              // highlight so the panel reads as machined material rather
              // than a floating black tile with a heavy drop shadow.
              "border border-line bg-surface-3/95 backdrop-blur-xl edge-light",
              // Two-layer shadow: a wide ambient pool at low alpha and a
              // tight contact shadow just beneath the panel. Together
              // they read as *lift*, not smear — the old
              // `--shadow-float` was one flat 55%-alpha slab, which is
              // what made the dropdown look dropped-in-Photoshop.
              "shadow-[0_20px_50px_-24px_rgb(0_0_0/0.55),0_6px_16px_-6px_rgb(0_0_0/0.35)]",
              // Layout: if there are more than five items, arrange in
              // two columns so a nine-item About dropdown does not read
              // as a long ladder that scrolls past the fold.
              links.length > 5
                ? "grid min-w-[24rem] grid-cols-2 gap-x-1"
                : "min-w-[17rem]",
              menuAlign === "right" ? "right-0" : "left-0",
            )}
          >
            {links.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                role="menuitem"
                className={cn(
                  "group/menuitem relative flex items-baseline justify-between gap-4 rounded-xl px-3.5 py-2.5",
                  "text-[0.9rem] text-ink-secondary",
                  "transition-[background-color,color] duration-(--duration-fast)",
                  "hover:bg-white/[0.05] hover:text-ink",
                )}
              >
                <span className="inline-flex items-center gap-2.5">
                  {/* Left dot rail — a hairline that lights up on hover.
                      Reads as a tiny "you are here" cue without adding
                      a heavy left-border on every row. */}
                  <span
                    aria-hidden
                    className="size-1 rounded-full bg-ink-faint transition-colors duration-(--duration-fast) group-hover/menuitem:bg-accent"
                  />
                  {link.label}
                </span>
                {link.note && (
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                    {link.note}
                  </span>
                )}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/* ============================================================
   Shop — quiet link, always the leftmost item
   ============================================================ */

function ShopLink({ pathname }: { pathname: string }) {
  const active = pathname === shopIndexLink.href;
  return (
    <Link
      href={shopIndexLink.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-11 items-center px-3 text-[0.8125rem] font-medium tracking-tight",
        "transition-colors duration-(--duration-fast)",
        active ? "text-ink" : "text-ink-secondary hover:text-ink",
      )}
    >
      {shopIndexLink.label}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-ink transition-transform duration-(--duration-fast) ease-(--ease-out-quart)",
          active && "scale-x-100",
        )}
      />
    </Link>
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
   Brand dropdown — compact, aligned under the trigger
   ============================================================ */

function BrandDropdown({
  item,
  open,
  onHover,
  onLeave,
}: {
  item: CategoryNavItem;
  open: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="menu"
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.985 }}
          transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
          className={cn(
            "absolute left-0 top-full z-40 mt-2 min-w-[17rem] rounded-2xl p-2",
            "border border-line bg-surface-3/95 backdrop-blur-xl edge-light",
            "shadow-[0_20px_50px_-24px_rgb(0_0_0/0.55),0_6px_16px_-6px_rgb(0_0_0/0.35)]",
          )}
        >
          <ul>
            {item.brands.map((brand) => (
              <li key={brand.label} role="none">
                <Link
                  href={brand.href}
                  role="menuitem"
                  className={cn(
                    "group/brand flex items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-[0.9rem]",
                    "text-ink-secondary transition-[background-color,color] duration-(--duration-fast) hover:bg-white/[0.05] hover:text-ink",
                  )}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="size-1 rounded-full bg-ink-faint transition-colors duration-(--duration-fast) group-hover/brand:bg-accent"
                    />
                    {brand.label}
                  </span>
                  <span className="font-mono text-[0.6875rem] tabular-nums text-ink-muted">
                    {brand.count}
                  </span>
                </Link>
              </li>
            ))}
            <li className="mt-1.5 border-t border-line pt-1.5" role="none">
              <Link
                href={item.href}
                role="menuitem"
                className="flex items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-[0.8125rem] font-medium text-ink hover:bg-white/[0.05]"
              >
                <span>All {item.label.toLowerCase()}</span>
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5 text-ink-muted"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </li>
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   More — overflow bucket for tail categories on tight widths
   ============================================================ */

function MoreItem({
  items,
  open,
  onHover,
  onLeave,
  onToggle,
  className,
}: {
  items: CategoryNavItem[];
  open: boolean;
  onHover: () => void;
  onLeave: () => void;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <li
      className={cn("relative", className)}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
        onFocus={onHover}
        onBlur={onLeave}
        className={cn(
          "relative inline-flex h-11 items-center gap-1 px-3 text-[0.8125rem] font-medium tracking-tight",
          "transition-colors duration-(--duration-fast)",
          open ? "text-ink" : "text-ink-secondary hover:text-ink",
        )}
      >
        More
        <Chevron open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
            className={cn(
              "absolute right-0 top-full z-40 mt-2 min-w-[17rem] rounded-2xl p-2",
              "border border-line bg-surface-3/95 backdrop-blur-xl edge-light",
              "shadow-[0_20px_50px_-24px_rgb(0_0_0/0.55),0_6px_16px_-6px_rgb(0_0_0/0.35)]",
            )}
          >
            <ul>
              {items.map((item) => (
                <li key={item.slug} role="none">
                  <Link
                    href={item.href}
                    role="menuitem"
                    className="group/more flex items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-[0.9rem] text-ink-secondary transition-[background-color,color] duration-(--duration-fast) hover:bg-white/[0.05] hover:text-ink"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="size-1 rounded-full bg-ink-faint transition-colors duration-(--duration-fast) group-hover/more:bg-accent"
                      />
                      {item.label}
                    </span>
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3 text-ink-muted"
                    >
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
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
