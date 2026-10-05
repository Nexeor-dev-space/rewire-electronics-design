"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { Thumbnail } from "@/components/admin/shared/row-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetTrashProduct, useGetTrashProducts, usePurgeProduct, useRestoreProduct } from "@/hooks/use-trash";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TrashProduct } from "@/types/trash";
import { DetailRow, TrashActions, TrashError, TrashPager, TrashSkeleton, formatDate } from "./trash-list";

const COLUMNS = "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_8rem_minmax(0,1.6fr)]";

type Confirm = { kind: "restore" | "purge"; product: TrashProduct } | null;

/**
 * Trash → Products: deleted products, newest first. Restore brings one back
 * to Products as a Draft; Delete permanently removes it and frees its slug
 * and SKUs. Both need the Trash permission (Restore, Delete).
 */
export function TrashProducts() {
  const access = useModuleAccess(PERMISSIONS.trash);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const products = useGetTrashProducts({ page, pageSize: ADMIN_PAGE_SIZE, search: search || undefined });
  const restore = useRestoreProduct();
  const purge = usePurgeProduct();
  const mutation = confirm?.kind === "purge" ? purge : restore;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function runConfirm() {
    if (!confirm) return;
    const lastOnPage = products.data?.items.length === 1 && page > 1;
    mutation.mutate(confirm.product.id, {
      onSuccess: () => {
        setConfirm(null);
        mutation.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelConfirm() {
    setConfirm(null);
    mutation.reset();
  }

  let content: ReactNode;
  if (products.isPending) {
    content = <TrashSkeleton columns={COLUMNS} header={<TableHeader />} />;
  } else if (products.isError) {
    content = <TrashError message={products.error.message} onRetry={() => products.refetch()} />;
  } else if (products.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search ? "No deleted products match" : "Trash is empty"}
        description={search ? `Nothing matches “${search}”.` : "Products you delete wait here until restored."}
      />
    );
  } else {
    const { items, total } = products.data;
    const busyId = mutation.isPending ? mutation.variables : undefined;

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((product) => (
              <li key={product.id} className="border-b border-line last:border-b-0">
                <div
                  className={cn(
                    "grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center",
                    COLUMNS,
                    busyId === product.id && "opacity-50",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Thumbnail url={product.imageUrl} />
                    <p className="truncate text-sm font-medium text-ink">{product.name}</p>
                  </div>
                  <p className="truncate text-sm text-ink-secondary">
                    {product.brand.name} · {product.category.name}
                  </p>
                  <time dateTime={product.deletedAt} className="text-sm text-ink-secondary">
                    {formatDate(product.deletedAt)}
                  </time>
                  <TrashActions
                    name={product.name}
                    busy={busyId === product.id}
                    onView={() => setViewing(product.id)}
                    onRestore={access.restore ? () => setConfirm({ kind: "restore", product }) : undefined}
                    onPurge={access.delete ? () => setConfirm({ kind: "purge", product }) : undefined}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <TrashPager page={page} pages={Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))} onPage={setPage} />
      </>
    );
  }

  return (
    <AdminPage title="Deleted Products" description="Deleted products, held for restore.">
      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search deleted products by name"
        aria-label="Search deleted products"
        className="mb-5 h-10 sm:w-80"
      />

      {content}

      <ProductDetailDialog id={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === "purge"
            ? `Delete ${confirm.product.name} permanently?`
            : `Restore ${confirm?.product.name ?? "product"}?`
        }
        description={
          confirm?.kind === "purge"
            ? "Its variants, images and specs go too. This can't be undone."
            : "It returns to Products as a Draft. Publish it again when it's ready."
        }
        confirmLabel={confirm?.kind === "purge" ? "Delete permanently" : "Restore"}
        error={mutation.isError ? mutation.error.message : undefined}
        loading={mutation.isPending}
        onCancel={cancelConfirm}
        onConfirm={runConfirm}
      />
    </AdminPage>
  );
}

function ProductDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const product = useGetTrashProduct(id);

  let body: ReactNode;
  if (product.isPending) {
    body = <Skeleton className="h-40 w-full" />;
  } else if (product.isError) {
    body = <p className="text-sm text-danger">{product.error.message}</p>;
  } else {
    const data = product.data;
    body = (
      <dl className="flex flex-col gap-3">
        <DetailRow label="Slug">{data.slug}</DetailRow>
        <DetailRow label="Brand">{data.brand.name}</DetailRow>
        <DetailRow label="Category">{data.category.name}</DetailRow>
        <DetailRow label="Warranty">{data.warrantyMonths} months</DetailRow>
        <DetailRow label="Images">{data.images.length}</DetailRow>
        <DetailRow label="Description">{data.description || "—"}</DetailRow>
        <DetailRow label="Variants">
          <ul className="flex flex-col gap-1">
            {data.variants.map((variant) => (
              <li key={variant.id} className="font-mono text-xs">
                {variant.sku} · {formatMoney(variant.price)} · {variant.stock} in stock
              </li>
            ))}
          </ul>
        </DetailRow>
      </dl>
    );
  }

  return (
    <Dialog open={id !== null} onClose={onClose} title={product.data?.name ?? "Deleted product"}>
      <DialogBody>{body}</DialogBody>
    </Dialog>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Product</p>
      <p className="eyebrow">Brand · Category</p>
      <p className="eyebrow">Deleted</p>
      <span className="sr-only">Actions</span>
    </div>
  );
}
