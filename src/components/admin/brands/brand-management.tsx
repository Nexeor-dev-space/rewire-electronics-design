"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions, Thumbnail } from "@/components/admin/shared/row-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteBrand, useGetBrands } from "@/hooks/use-brand";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BrandListItem } from "@/types/brand";
import { BrandFormModal } from "./brand-form-modal";

const COLUMNS = "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem]";

type Modal = { kind: "create" } | { kind: "edit"; id: string } | null;

export function BrandManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<BrandListItem | null>(null);

  const brands = useGetBrands({ page, pageSize: ADMIN_PAGE_SIZE, search: search || undefined });
  const deleteBrand = useDeleteBrand();

  // Search once typing pauses.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function confirmDelete() {
    if (!toDelete) return;
    const lastOnPage = brands.data?.items.length === 1 && page > 1;

    deleteBrand.mutate(toDelete.id, {
      // A refusal keeps the dialog open and explains itself there.
      onSuccess: () => {
        setToDelete(null);
        deleteBrand.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteBrand.reset();
  }

  let content: ReactNode;
  if (brands.isPending) {
    content = <TableSkeleton />;
  } else if (brands.isError) {
    content = (
      <div
        role="alert"
        className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center"
      >
        <p className="text-sm text-ink-secondary">{brands.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => brands.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (brands.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search ? "No brands match" : "No brands yet"}
        description={
          search ? `Nothing matches “${search}”.` : "Add the manufacturers you stock."
        }
      />
    );
  } else {
    const { items, total } = brands.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((brand) => (
              <li key={brand.id} className="border-b border-line last:border-b-0">
                <BrandRow
                  brand={brand}
                  deleting={deleteBrand.isPending && deleteBrand.variables === brand.id}
                  onEdit={() => setModal({ kind: "edit", id: brand.id })}
                  onDelete={() => setToDelete(brand)}
                />
              </li>
            ))}
          </ul>
        </div>

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
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
      title="Brands"
      description="Brand records and the logos they carry."
      actions={
        <Button size="sm" onClick={() => setModal({ kind: "create" })}>
          Add brand
        </Button>
      }
    >
      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search brands by name"
        aria-label="Search brands"
        className="mb-5 h-10 sm:w-80"
      />

      {content}

      {modal && (
        <BrandFormModal
          brandId={modal.kind === "edit" ? modal.id : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "brand"}?`}
        description="This removes the brand record and its image."
        confirmLabel="Delete brand"
        error={deleteBrand.isError ? deleteBrand.error.message : undefined}
        loading={deleteBrand.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function BrandRow({
  brand,
  deleting,
  onEdit,
  onDelete,
}: {
  brand: BrandListItem;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS, deleting && "opacity-50")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Thumbnail url={brand.imageUrl} />
        <p className="truncate text-sm font-medium text-ink">{brand.name}</p>
      </div>

      <time dateTime={brand.updatedAt} className="text-sm text-ink-secondary">
        {new Date(brand.updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </time>

      <RowActions name={brand.name} disabled={deleting} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Brand</p>
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
          className={cn(
            "grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0",
            COLUMNS,
          )}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
