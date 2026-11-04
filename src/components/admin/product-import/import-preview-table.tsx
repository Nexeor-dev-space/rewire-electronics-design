"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { importColumnHeader } from "@/lib/product-import";
import { cn } from "@/lib/utils";
import type { ImportPreview, ImportPreviewRow } from "@/types/product-import";

const FILTERS = ["all", "valid", "errors"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = { all: "All", valid: "Valid", errors: "Errors" };
const COLUMNS = "grid-cols-[3.5rem_minmax(10rem,2fr)_minmax(8rem,1.5fr)_minmax(7rem,1fr)_6rem_4rem_minmax(12rem,2.5fr)]";

const humanise = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

function variantDetails(row: ImportPreviewRow): string {
  return [row.storage, row.colour, row.condition && humanise(row.condition)].filter(Boolean).join(" · ") || "None";
}

export function ImportPreviewTable({ preview }: { preview: ImportPreview }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const rows = preview.rows.filter((row) =>
    filter === "all" ? true : filter === "valid" ? row.errors.length === 0 : row.errors.length > 0,
  );
  const pages = Math.max(1, Math.ceil(rows.length / ADMIN_PAGE_SIZE));
  const visible = rows.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter rows">
        {FILTERS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "primary" : "outline"}
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            {FILTER_LABELS[value]}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface-2 px-6 py-10 text-center text-sm text-ink-secondary">
          No rows to show.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="min-w-[56rem]">
            <div
              className={cn(
                "grid gap-x-4 border-b border-line bg-surface-2 px-5 py-3 text-xs uppercase tracking-wide text-ink-muted",
                COLUMNS,
              )}
            >
              <span>Row</span>
              <span>Product</span>
              <span>Variant</span>
              <span>SKU</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Status</span>
            </div>
            <ul>
              {visible.map((row) => (
                <li key={row.rowNumber} className="border-b border-line last:border-b-0">
                  <PreviewRow row={row} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
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
    </div>
  );
}

function PreviewRow({ row }: { row: ImportPreviewRow }) {
  const invalid = row.errors.length > 0;
  return (
    <div className={cn("grid gap-x-4 px-5 py-3 text-sm", COLUMNS)}>
      <span className="font-mono tabular-nums text-ink-secondary">{row.rowNumber}</span>
      <span className="min-w-0 break-words text-ink">{row.productName || row.productSlug || "None"}</span>
      <span className="min-w-0 text-ink-secondary">{variantDetails(row)}</span>
      <span className="min-w-0 break-all font-mono text-xs text-ink">{row.sku || "None"}</span>
      <span className="tabular-nums text-ink">{row.price === null ? "None" : formatMoney(row.price)}</span>
      <span className="tabular-nums text-ink">{row.stock ?? "None"}</span>
      <div className="min-w-0">
        <p className={cn("font-medium", invalid ? "text-danger" : "text-live")}>
          {invalid ? "Needs fixing" : row.action === "UPDATE" ? "Will update" : "Will create"}
        </p>
        {invalid ? (
          <ul className="mt-1 space-y-1 text-xs text-danger">
            {row.errors.map((error, index) => (
              <li key={index}>
                {error.column ? `${importColumnHeader(error.column)}: ` : ""}
                {error.message}
              </li>
            ))}
          </ul>
        ) : row.changes.length > 0 ? (
          <ul className="mt-1 space-y-1 text-xs text-ink-secondary">
            {row.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        ) : (
          row.action === "UPDATE" && <p className="mt-1 text-xs text-ink-secondary">Nothing changes</p>
        )}
      </div>
    </div>
  );
}
