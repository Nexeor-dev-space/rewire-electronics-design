import type { ReactNode } from "react";
import { AdminBreadcrumbs } from "./admin-breadcrumbs";

/**
 * AdminPage — the page frame inside the shell: breadcrumb trail, title,
 * one line of description and an optional action slot, above whatever
 * the module renders.
 *
 * Every admin surface uses this, so a module built later inherits the
 * console's page rhythm by reaching for the same component rather than
 * laying out its own header.
 */

interface AdminPageProps {
  title: string;
  description?: string;
  /** Right-hand chrome next to the title, e.g. a "New product" button. */
  actions?: ReactNode;
  children?: ReactNode;
}

export function AdminPage({
  title,
  description,
  actions,
  children,
}: AdminPageProps) {
  return (
    <div className="mx-auto w-full max-w-[90rem]">
      <AdminBreadcrumbs />

      <header className="mb-8 mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-tight tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              {description}
            </p>
          )}
        </div>
        {actions}
      </header>

      {children}
    </div>
  );
}

/**
 * AdminEmptyState — the "nothing here yet" panel.
 *
 * Used by every placeholder module, and worth keeping afterwards: a
 * built module with no records to show needs exactly this surface.
 */
export function AdminEmptyState({
  title = "Coming soon",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface-2 px-6 py-16 text-center">
      <p className="text-base text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">
          {description}
        </p>
      )}
    </div>
  );
}
