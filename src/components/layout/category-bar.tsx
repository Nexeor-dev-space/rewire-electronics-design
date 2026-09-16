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
import { POLICY_ROUTES } from "@/lib/policy-types";
import { cn } from "@/lib/utils";
import { MegaMenu, megaMenuId } from "./mega-menu";
import { CategoryMegaPanel } from "./category-mega-panel";

const POLICY_PATHS = new Set(Object.values(POLICY_ROUTES));

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
      className="relative hidden border-y border-line md:block"
    >
      <ul className="mx-auto flex w-full max-w-[110rem] items-stretch justify-center gap-1 px-(--spacing-gutter)">

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
            onJoinWaitlist={() => {}}
          />
        )}
      </AnimatePresence>
    </li>
  );
}
