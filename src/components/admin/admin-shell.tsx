"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ADMIN_ROOT } from "@/lib/admin-nav";
import { adminConsole } from "@/lib/admin-console";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { AdminNavList } from "./admin-nav";
import { AdminUserMenu } from "./admin-user-menu";

/**
 * AdminShell — the frame every admin page sits in.
 *
 * Desktop: a fixed 18rem navigation rail with the content column beside
 * it. Below `lg` the rail becomes a drawer behind the header's menu
 * button, so the console keeps one navigation model at every width
 * rather than a second, thinner one for phones.
 *
 * The whole frame is scoped to `.admin-theme`, the light token set in
 * globals.css. Every component inside it — Card, Button, Badge — reads
 * the same tokens it always did and comes out light, with no admin
 * variant of its own.
 */

const RAIL_EXPANDED = "w-72";
const RAIL_COLLAPSED = "w-20";

export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation. `onNavigate` covers a click on a nav
  // row; this covers everything else that can change the route (a
  // breadcrumb, the back button, a redirect).
  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.documentElement.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  return (
    <div className="admin-theme flex min-h-dvh w-full bg-void text-ink">
      {/* Keyboard users can bypass the whole rail */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-void"
      >
        Skip to content
      </a>

      {/* ---------- Desktop rail ---------- */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-void lg:flex"
        animate={{ width: sidebarCollapsed ? 80 : 288 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      >
        <RailContents
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </motion.aside>

      {/* ---------- Mobile / tablet drawer ---------- */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-ink/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.menu }}
            />
            <motion.aside
              className={`absolute inset-y-0 left-0 flex flex-col border-r border-line bg-void ${RAIL_EXPANDED}`}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            >
              <RailContents onNavigate={() => setDrawerOpen(false)} collapsed={false} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- Content column ---------- */}
      <motion.div
        className="flex min-w-0 flex-1 flex-col"
        animate={{ paddingLeft: sidebarCollapsed ? 80 : 288 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-void/85 px-4 backdrop-blur-md md:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="-ml-1 rounded-lg p-2 text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="size-5"
              aria-hidden
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <Link
            href={ADMIN_ROOT}
            className="font-medium tracking-tight text-ink lg:hidden"
          >
            {adminConsole.name}
            <span className="ml-1.5 text-ink-muted">{adminConsole.label}</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-lg px-3 py-1.5 text-sm text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink sm:block"
            >
              View storefront
            </Link>
            <AdminUserMenu />
          </div>
        </header>

        <main id="admin-main" className="flex-1 px-4 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </motion.div>
    </div>
  );
}

/**
 * Rail contents — brand head, then the scrolling navigation list. Shared
 * by the fixed desktop rail and the drawer so both render the same tree.
 */
function RailContents({
  onNavigate,
  collapsed,
  onToggleCollapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-3 lg:px-6">
        {!collapsed && (
          <Link
            href={ADMIN_ROOT}
            onClick={onNavigate}
            className="text-[1.0625rem] font-medium tracking-tight text-ink"
          >
            {adminConsole.name}
            <span className="ml-1.5 font-normal text-ink-muted">
              {adminConsole.label}
            </span>
          </Link>
        )}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden rounded-lg p-2 text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink lg:block"
          >
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
              aria-hidden
              animate={{ scaleX: collapsed ? -1 : 1 }}
            >
              <path d="M15 18l-6-6 6-6M9 12h12" />
            </motion.svg>
          </button>
        )}
      </div>

      {/* `data-lenis-prevent` keeps the site's smooth-scroll driver off this
          column, so the rail scrolls natively while the page behind it does
          not move with it. */}
      <div
        data-lenis-prevent
        className="flex-1 overflow-y-auto px-3 pt-5 scrollbar-thin"
      >
        <AdminNavList onNavigate={onNavigate} collapsed={collapsed} />
      </div>
    </>
  );
}
