"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminBreadcrumbs } from "@/lib/admin-nav";

/**
 * Breadcrumb trail, derived from the current path and the navigation
 * config rather than declared per page — so every admin route, including
 * the detail and form routes each module will grow later, gets a correct
 * trail without its page asking for one.
 */
export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = getAdminBreadcrumbs(pathname);

  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && (
                <li aria-hidden className="text-ink-faint">
                  /
                </li>
              )}
              <li>
                {crumb.href && !last ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors duration-(--duration-fast) hover:text-ink"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={last ? "text-ink-secondary" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
