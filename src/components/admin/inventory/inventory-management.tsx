"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInventory, useSetStock } from "@/hooks/use-inventory";
import { PRODUCT_STATUS_LABELS } from "@/lib/catalogue";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD } from "@/types/commerce";
import type { InventoryItem } from "@/types/inventory";
import { STOCK_FILTERS, type StockFilter } from "@/validators/inventory.validator";
import { stockValidator } from "@/validators/product.validator";

const COLUMNS = "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_7rem_7rem_12rem]";

const STOCK_FILTER_LABELS: Record<StockFilter, string> = {
  all: "All stock",
  low: `Low (under ${LOW_STOCK_THRESHOLD})`,
  out: "Out of stock",
};

export function InventoryManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState<StockFilter>("all");
  const [page, setPage] = useState(1);

  const inventory = useGetInventory({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    stock,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  let content: ReactNode;
  if (inventory.isPending) {
    content = <TableSkeleton />;
  } else if (inventory.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{inventory.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => inventory.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (inventory.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search || stock !== "all" ? "Nothing matches" : "No variants yet"}
        description={
          search || stock !== "all"
            ? "No variants match these filters."
            : "Stock appears here once products have variants."
        }
      />
    );
  } else {
    const { items, total } = inventory.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((item) => (
              <li key={item.id} className="border-b border-line last:border-b-0">
                <InventoryRow key={`${item.id}-${item.stock}`} item={item} />
              </li>
            ))}
          </ul>
        </div>

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
              {page} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </>
    );
  }

  return (
    <AdminPage
      title="Inventory"
      description="Stock on hand per variant. Scarcest first."
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by product or SKU"
          aria-label="Search inventory"
          className="h-10 sm:w-80"
        />
        <Select
          value={stock}
          onChange={(event) => {
            setStock(event.target.value as StockFilter);
            setPage(1);
          }}
          aria-label="Filter by stock"
          className="h-10 sm:w-48"
        >
          {STOCK_FILTERS.map((value) => (
            <option key={value} value={value}>
              {STOCK_FILTER_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}
    </AdminPage>
  );
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const [value, setValue] = useState(String(item.stock));
  const [error, setError] = useState<string | undefined>();
  const setStock = useSetStock();

  const options = [item.storage, item.colour].filter(Boolean).join(" · ");
  const dirty = value !== String(item.stock);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = stockValidator.safeParse(value.trim() === "" ? null : Number(value));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setStock.mutate(
      { variantId: item.id, stock: parsed.data },
      { onError: (failure) => setError(failure.message) },
    );
  }

  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS)}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{item.product.name}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-ink-muted">{item.sku}</p>
      </div>
      <p className="truncate text-sm text-ink-secondary">{options || "—"}</p>
      <p className="text-sm tabular-nums text-ink-secondary">{formatMoney(item.price)}</p>
      <div>
        <Badge
          variant={item.product.status === "PUBLISHED" ? "accent" : "outline"}
          className="px-2 py-1 text-[0.625rem]"
        >
          {PRODUCT_STATUS_LABELS[item.product.status]}
        </Badge>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-label={`Stock for ${item.sku}`}
            aria-invalid={error ? true : undefined}
            className={cn(
              "h-9 w-20 px-2 text-sm tabular-nums",
              item.stock === 0 && "text-danger",
            )}
          />
          <Button type="submit" variant="outline" size="sm" className="h-9 px-3" disabled={!dirty} loading={setStock.isPending}>
            Save
          </Button>
        </div>
        <FieldError className="text-xs">{error}</FieldError>
      </form>
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Product · SKU</p>
      <p className="eyebrow">Options</p>
      <p className="eyebrow">Price</p>
      <p className="eyebrow">Status</p>
      <p className="eyebrow">Stock</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      <TableHeader />
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className={cn("grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}
        >
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      ))}
    </div>
  );
}
