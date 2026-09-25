"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions, Thumbnail } from "@/components/admin/shared/row-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteProduct, useGetProducts, useSetProductStatus } from "@/hooks/use-product";
import { PRODUCT_STATUS_LABELS } from "@/lib/catalogue";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductListItem } from "@/types/product";
import { PRODUCT_STATUSES, type ProductStatus } from "@/validators/product.validator";
import { ProductFormModal } from "./product-form-modal";

const COLUMNS =
  "lg:grid-cols-[minmax(0,2.4fr)_9rem_7rem_5rem_minmax(0,1fr)_6rem]";

type Modal = { kind: "create" } | { kind: "edit"; id: string } | null;

export function ProductManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<ProductListItem | null>(null);

  const products = useGetProducts({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
  });
  const deleteProduct = useDeleteProduct();
  const setProductStatus = useSetProductStatus();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function confirmDelete() {
    if (!toDelete) return;
    const lastOnPage = products.data?.items.length === 1 && page > 1;

    deleteProduct.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        deleteProduct.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteProduct.reset();
  }

  const busyId = setProductStatus.isPending ? setProductStatus.variables?.id : undefined;
  const deletingId = deleteProduct.isPending ? deleteProduct.variables : undefined;

  let content: ReactNode;
  if (products.isPending) {
    content = <TableSkeleton />;
  } else if (products.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{products.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => products.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (products.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search || status ? "No products match" : "No products yet"}
        description={
          search || status
            ? "Nothing matches these filters."
            : "Add a product with at least one variant, then publish it when it has an image."
        }
      />
    );
  } else {
    const { items, total } = products.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((product) => (
              <li key={product.id} className="border-b border-line last:border-b-0">
                <ProductRow
                  product={product}
                  busy={busyId === product.id || deletingId === product.id}
                  onStatusChange={(next) => setProductStatus.mutate({ id: product.id, status: next })}
                  onEdit={() => setModal({ kind: "edit", id: product.id })}
                  onDelete={() => setToDelete(product)}
                />
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
      title="Products"
      description="Product information, variants, images and specifications. Variants carry storage, colour, price and stock."
      actions={
        <Button size="sm" onClick={() => setModal({ kind: "create" })}>
          Add product
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name, slug or SKU"
          aria-label="Search products"
          className="h-10 sm:w-80"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ProductStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 sm:w-44"
        >
          <option value="">All statuses</option>
          {PRODUCT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PRODUCT_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {setProductStatus.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {setProductStatus.error.message}
        </p>
      )}

      {content}

      {modal && (
        <ProductFormModal
          productId={modal.kind === "edit" ? modal.id : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "product"}?`}
        description="This removes the product, its variants, images and specs. Archive it instead to keep the record."
        confirmLabel="Delete product"
        error={deleteProduct.isError ? deleteProduct.error.message : undefined}
        loading={deleteProduct.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function ProductRow({
  product,
  busy,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  product: ProductListItem;
  busy: boolean;
  onStatusChange: (status: ProductStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-2 px-5 py-4 lg:items-center", COLUMNS, busy && "opacity-50")}>
      <div className="flex min-w-0 items-center gap-3">
        <Thumbnail url={product.imageUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{product.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {product.brand.name} · {product.category.name}
          </p>
        </div>
      </div>

      <Select
        value={product.status}
        disabled={busy}
        onChange={(event) => onStatusChange(event.target.value as ProductStatus)}
        aria-label={`Status of ${product.name}`}
        className="h-9 text-xs"
      >
        {PRODUCT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {PRODUCT_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>

      <p className="text-sm tabular-nums text-ink-secondary">
        {product.priceFrom === null ? "—" : formatMoney(product.priceFrom)}
      </p>

      <p
        className={cn(
          "text-sm tabular-nums",
          product.totalStock === 0 ? "text-danger" : "text-ink-secondary",
        )}
      >
        {product.totalStock}
      </p>

      <time dateTime={product.updatedAt} className="text-sm text-ink-secondary">
        {new Date(product.updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </time>

      <RowActions name={product.name} disabled={busy} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Product</p>
      <p className="eyebrow">Status</p>
      <p className="eyebrow">From</p>
      <p className="eyebrow">Stock</p>
      <p className="eyebrow">Last edited</p>
      <span className="sr-only">Actions</span>
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
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
