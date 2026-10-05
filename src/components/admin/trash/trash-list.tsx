"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The frame both Trash screens share: the error, skeleton and pagination
 * around their rows, and the row's View / Restore / Delete permanently
 * buttons. Each screen supplies its own columns.
 */

export function TrashError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
      <p className="text-sm text-ink-secondary">{message}</p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function TrashSkeleton({ columns, header }: { columns: string; header: ReactNode }) {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      {header}
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={cn("grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0", columns)}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-40" />
        </div>
      ))}
    </div>
  );
}

export function TrashPager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
        {page} / {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

/** Leave out a handler and its button is not shown. */
export function TrashActions({
  name,
  busy,
  onView,
  onRestore,
  onPurge,
}: {
  name: string;
  busy: boolean;
  onView: () => void;
  onRestore?: () => void;
  onPurge?: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 lg:mt-0 lg:justify-end">
      <Button variant="ghost" size="sm" onClick={onView} aria-label={`View ${name}`}>
        View
      </Button>
      {onRestore && (
        <Button variant="outline" size="sm" disabled={busy} onClick={onRestore} aria-label={`Restore ${name}`}>
          Restore
        </Button>
      )}
      {onPurge && (
        <Button variant="outline" size="sm" disabled={busy} onClick={onPurge} aria-label={`Delete ${name} permanently`}>
          Delete permanently
        </Button>
      )}
    </div>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** A label and value pair in a detail dialog. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}
