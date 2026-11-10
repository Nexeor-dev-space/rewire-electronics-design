"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProductImportRows } from "@/hooks/use-product-import";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import type { ImportRowStatus } from "@/lib/product-import";

export function ImportRowsList({ importId, status }: { importId: string; status?: ImportRowStatus }) {
  const [page, setPage] = useState(1);
  const rows = useGetProductImportRows(importId, { page, pageSize: ADMIN_PAGE_SIZE, status });
  const pages = rows.data ? Math.max(1, Math.ceil(rows.data.total / ADMIN_PAGE_SIZE)) : 1;

  if (rows.isPending) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (rows.isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {rows.error.message}
      </p>
    );
  }
  if (rows.data.items.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface-2 px-6 py-8 text-center text-sm text-ink-secondary">
        No rows to show.
      </p>
    );
  }

  return (
    <>
      <ul className="rounded-xl border border-line">
        {rows.data.items.map((row) => (
          <li key={row.id} className="border-b border-line px-4 py-3 text-sm last:border-b-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-ink">
                <span className="mr-2 font-mono text-xs text-ink-secondary">Row {row.rowNumber}</span>
                {row.productName}
              </span>
              <span className="font-mono text-xs text-ink-secondary">{row.sku}</span>
            </div>
            {row.error && <p className="mt-1 text-xs text-danger">{row.error}</p>}
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-3 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </nav>
      )}
    </>
  );
}
