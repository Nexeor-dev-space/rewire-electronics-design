"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Dialog, DialogBody } from "@/components/ui/dialog";
import { useStorefrontCategories } from "@/components/providers/storefront-categories-provider";
import { categoryNav, type CategoryNavItem } from "@/lib/navigation";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The category popup — one list of categories in two shells.
 *
 * `CategoriesDropdown` (from `lg`) drops under the category bar's
 * Categories button: a plate of rows, each a grid icon, the category name
 * and a chevron. Pointing at a row that has brands opens a flyout beside
 * the plate with those brands, so a reader can go straight to "Laptops ·
 * Apple" without loading the category first.
 *
 * `CategoriesDialog` (below `lg`) is the same rows in the shared `Dialog`,
 * opened by the tab bar's Categories tab: a bottom sheet on phones, a
 * centred panel on tablets. Close icon, backdrop and Escape all close it.
 *
 * Every row links to its category listing; selecting one closes the popup.
 */

export const CATEGORIES_POPUP_ID = "categories-popup";

const ALL_DEVICES_LABEL = "All devices";

/* ============================================================
   Desktop dropdown
   ============================================================ */

export function CategoriesDropdown({
  labelledBy,
  onNavigate,
}: {
  labelledBy: string;
  onNavigate: () => void;
}) {
  const items = categoryNav(useStorefrontCategories());
  const reduceMotion = useReducedMotion();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const active = items.find((item) => item.slug === activeSlug && item.brands.length > 0);

  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 };
  const shown = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.div
      id={CATEGORIES_POPUP_ID}
      role="menu"
      aria-labelledby={labelledBy}
      initial={hidden}
      animate={shown}
      exit={hidden}
      transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
      onMouseLeave={() => setActiveSlug(null)}
      className="absolute left-0 top-full z-10 flex pt-2"
    >
      <ul className="w-72 overflow-hidden rounded-2xl border border-line bg-surface py-2 shadow-(--shadow-float)">
        {items.map((item) => (
          <li key={item.slug}>
            <CategoryRow
              item={item}
              role="menuitem"
              highlighted={item.slug === activeSlug}
              onPoint={() => setActiveSlug(item.slug)}
              onNavigate={onNavigate}
            />
          </li>
        ))}
        <li className="mt-1 border-t border-line pt-1">
          <AllDevicesRow role="menuitem" onNavigate={onNavigate} />
        </li>
      </ul>

      {active && (
        <div className="ml-2 w-64 self-start rounded-2xl border border-line bg-surface py-2 shadow-(--shadow-float)">
          <p className="px-5 pb-2 pt-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
            {active.label} by brand
          </p>
          <ul>
            {active.brands.map((brand) => (
              <li key={brand.href}>
                <Link
                  href={brand.href}
                  role="menuitem"
                  onClick={onNavigate}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 text-[0.8125rem] text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-ink/5 hover:text-ink"
                >
                  <span className="min-w-0 truncate">{brand.label}</span>
                  <span className="font-mono text-[0.6875rem] tabular-nums text-ink-faint">{brand.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

/* ============================================================
   Phone and tablet dialog
   ============================================================ */

export function CategoriesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = categoryNav(useStorefrontCategories());

  return (
    <Dialog open={open} onClose={onClose} title="Categories" className="sm:max-w-md">
      <DialogBody className="px-0 py-2">
        <ul id={CATEGORIES_POPUP_ID}>
          {items.map((item) => (
            <li key={item.slug}>
              <CategoryRow item={item} onNavigate={onClose} />
            </li>
          ))}
          <li className="mt-1 border-t border-line pt-1">
            <AllDevicesRow onNavigate={onClose} />
          </li>
        </ul>
      </DialogBody>
    </Dialog>
  );
}

/* ============================================================
   Rows
   ============================================================ */

const ROW_CLASS = cn(
  "flex min-h-12 items-center gap-3.5 px-5 py-3 text-[0.8125rem] font-medium uppercase tracking-[0.06em]",
  "transition-colors duration-(--duration-fast)",
);

function CategoryRow({
  item,
  role,
  highlighted,
  onPoint,
  onNavigate,
}: {
  item: CategoryNavItem;
  role?: "menuitem";
  highlighted?: boolean;
  onPoint?: () => void;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      role={role}
      onClick={onNavigate}
      onMouseEnter={onPoint}
      onFocus={onPoint}
      className={cn(
        ROW_CLASS,
        highlighted ? "bg-ink/5 text-ink" : "text-ink-secondary hover:bg-ink/5 hover:text-ink",
      )}
    >
      <GridIcon className="size-4 shrink-0 text-ink-muted" />
      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
      <ChevronRight className="size-3.5 shrink-0 text-ink-faint" />
    </Link>
  );
}

function AllDevicesRow({ role, onNavigate }: { role?: "menuitem"; onNavigate: () => void }) {
  return (
    <Link
      href={SHOP_INDEX_HREF}
      role={role}
      onClick={onNavigate}
      className={cn(ROW_CLASS, "text-ink hover:bg-ink/5")}
    >
      <GridIcon className="size-4 shrink-0 text-accent" />
      <span className="min-w-0 flex-1">{ALL_DEVICES_LABEL}</span>
      <ChevronRight className="size-3.5 shrink-0 text-ink-faint" />
    </Link>
  );
}

/* ---------- Icons — thin-line, currentColor ---------- */

export function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}
