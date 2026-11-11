"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigation } from "@/components/providers/navigation-provider";
import { useStorefrontCategories } from "@/components/providers/storefront-categories-provider";
import {
  categoryNav,
  categoryNavIsActive,
  editorialNavLink,
  upcomingDropsLink,
  type MegaMenuId,
} from "@/lib/navigation";
import { POLICY_ROUTES } from "@/lib/policy-types";
import { cn } from "@/lib/utils";
import { MegaMenu, megaMenuId } from "./mega-menu";
import { CATEGORIES_POPUP_ID, CategoriesDropdown, GridIcon } from "./categories-popup";

const POLICY_PATHS = new Set(Object.values(POLICY_ROUTES));

const CLOSE_DELAY = 130;

/** The `open` key of the Categories popup; the other menus use their own. */
const CATEGORIES_KEY = "__categories";
const CATEGORIES_TRIGGER_ID = `${CATEGORIES_POPUP_ID}-trigger`;

export function CategoryBar() {
  const pathname = usePathname();
  const items = categoryNav(useStorefrontCategories());
  const { extraLinks } = useNavigation().header;
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
      className="relative hidden border-y border-line lg:block"
    >
      <ul className="mx-auto flex w-full max-w-[110rem] items-stretch justify-center-safe gap-1 px-(--spacing-gutter)">
        <CategoriesMenuItem
          active={items.some((item) => categoryNavIsActive(pathname, item.slug))}
          open={open === CATEGORIES_KEY}
          onToggle={() => setOpen(open === CATEGORIES_KEY ? null : CATEGORIES_KEY)}
          onClose={() => setOpen(null)}
        />

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

        {extraLinks.map((item) => (
          <li key={item.id} className="shrink-0">
            <Link
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center px-3 text-[0.8125rem] font-medium tracking-tight",
                "transition-colors duration-(--duration-fast)",
                pathname === item.href ? "text-ink" : "text-ink-secondary hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}

        <MegaMenuItem
          menuId="about"
          label={editorialNavLink.label}
          href={editorialNavLink.href}
          active={
            pathname === editorialNavLink.href ||
            pathname.startsWith(`${editorialNavLink.href}/`) ||
            pathname.startsWith("/support") ||
            POLICY_PATHS.has(pathname)
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

/**
 * The Categories trigger. Click only, unlike the hover menus beside it:
 * it opens `CategoriesDropdown`, and a click anywhere outside, Escape or a
 * route change closes it.
 */
function CategoriesMenuItem({
  active,
  open,
  onToggle,
  onClose,
}: {
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);

  return (
    <li ref={ref} className="relative shrink-0">
      <button
        type="button"
        id={CATEGORIES_TRIGGER_ID}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={CATEGORIES_POPUP_ID}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-11 items-center gap-2 px-3 text-[0.8125rem] font-medium tracking-tight",
          "transition-colors duration-(--duration-fast)",
          active || open ? "text-ink" : "text-ink-secondary hover:text-ink",
        )}
      >
        <GridIcon className="size-4" />
        Categories
        <Chevron open={open} />
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-ink transition-transform duration-(--duration-fast) ease-(--ease-out-quart)",
            (active || open) && "scale-x-100",
          )}
        />
      </button>

      <AnimatePresence>
        {open && <CategoriesDropdown labelledBy={CATEGORIES_TRIGGER_ID} onNavigate={onClose} />}
      </AnimatePresence>
    </li>
  );
}

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
          />
        )}
      </AnimatePresence>
    </li>
  );
}
