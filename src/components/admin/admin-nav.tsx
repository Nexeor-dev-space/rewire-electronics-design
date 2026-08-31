"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  adminNav,
  isAdminItemActive,
  matchAdminRoute,
  type AdminNavItem,
} from "@/lib/admin-nav";
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
}

export function AdminNavList({ onNavigate }: Props) {
  const pathname = usePathname();
  const match = matchAdminRoute(pathname);

  return (
    <nav aria-label="Admin" className="flex flex-col gap-7 pb-8">
      {adminNav.map((section) => (
        <div key={section.area}>
          <p className="mb-2 flex items-center gap-2 px-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
            <SectionGlyph paths={section.glyph} />
            {section.label}
          </p>

          <ul className="flex flex-col gap-0.5">
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
          </ul>
        </div>
      ))}
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
