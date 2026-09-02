"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  adminNav,
  isAdminItemActive,
  matchAdminRoute,
  type AdminNavItem,
} from "@/lib/admin-nav";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The admin navigation list.
 *
 * Renders whatever `@/lib/admin-nav` declares — this component knows
 * about sections, rows and nested rows, never about Products or Orders.
 * Adding a module to the config puts it in the sidebar; nothing here
 * needs to change for it.
 *
 * The same list is used by the fixed desktop rail and by the mobile
 * drawer, so the two navigations can never drift apart. `onNavigate`
 * lets the drawer close itself on a click; the rail passes nothing.
 */

interface Props {
  onNavigate?: () => void;
  /** Retracted rail: section glyphs only, no labels and no rows. */
  collapsed?: boolean;
  /**
   * Set only while retracted. Clicking a section glyph then reopens the
   * rail rather than toggling an accordion nobody can see.
   */
  onExpand?: () => void;
}

export function AdminNavList({ onNavigate, collapsed, onExpand }: Props) {
  const pathname = usePathname();
  const match = matchAdminRoute(pathname);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(adminNav.map((section) => section.area)),
  );

  // The admin layout persists across `/admin/*`, so this state outlives a
  // route change. Reopen whichever section owns the new route, otherwise
  // navigating into a section the user had collapsed would hide the page
  // they are actually on.
  const activeArea = match?.section.area;
  useEffect(() => {
    if (!activeArea) return;
    setOpenSections((open) =>
      open.has(activeArea) ? open : new Set(open).add(activeArea),
    );
  }, [activeArea]);

  const toggleSection = (area: string) => {
    setOpenSections((open) => {
      const next = new Set(open);
      if (!next.delete(area)) next.add(area);
      return next;
    });
  };

  return (
    <nav aria-label="Admin" className="flex flex-col gap-7 pb-8">
      {adminNav.map((section) => {
        const isOpen = openSections.has(section.area);
        const hasActiveItem = section.items.some(
          (item) =>
            isAdminItemActive(match, item) ||
            item.children?.some((child) => isAdminItemActive(match, child)),
        );

        return (
          <div key={section.area}>
            <button
              type="button"
              onClick={() => {
                // Retracted, the rows are not rendered — so reveal them by
                // reopening the rail with this section already unfolded.
                if (collapsed) {
                  setOpenSections((open) => new Set(open).add(section.area));
                  onExpand?.();
                  return;
                }
                toggleSection(section.area);
              }}
              className={cn(
                "mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] transition-colors duration-(--duration-fast)",
                collapsed && "justify-center",
                hasActiveItem
                  ? "bg-surface text-ink"
                  : "text-ink-muted hover:bg-surface/50 hover:text-ink",
              )}
              aria-expanded={collapsed ? undefined : isOpen}
              aria-label={collapsed ? section.label : `Toggle ${section.label}`}
              title={collapsed ? section.label : undefined}
            >
              <SectionGlyph paths={section.glyph} />
              {!collapsed && (
                <>
                  {section.label}
                  <motion.div
                    className="ml-auto flex items-center"
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: DURATION.fast }}
                  >
                    <ChevronDown />
                  </motion.div>
                </>
              )}
            </button>

            {!collapsed && (
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul
                    className="flex flex-col gap-0.5 overflow-hidden"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: DURATION.menu, ease: EASE_OUT_EXPO }}
                  >
                    {section.items.map((item) => (
                      <li key={item.key}>
                        <NavRow
                          item={item}
                          active={isAdminItemActive(match, item)}
                          onNavigate={onNavigate}
                        />

                        {item.children && (
                          <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-line pl-2">
                            {item.children.map((child) => (
                              <li key={child.key}>
                                <NavRow
                                  item={child}
                                  active={isAdminItemActive(match, child)}
                                  onNavigate={onNavigate}
                                  nested
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function NavRow({
  item,
  active,
  nested,
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-lg px-3 py-1.5 text-[0.9375rem] leading-6",
        "transition-[background-color,color] duration-(--duration-fast)",
        nested && "text-[0.875rem]",
        active
          ? "bg-surface font-medium text-ink"
          : "text-ink-secondary hover:bg-surface hover:text-ink",
      )}
    >
      {item.label}
    </Link>
  );
}

/** Section glyph — 24×24, hairline stroke, same weight as the site's icons. */
function SectionGlyph({ paths }: { paths: string[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
      aria-hidden
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
