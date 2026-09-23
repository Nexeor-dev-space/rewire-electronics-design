"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteAddOn, useGetAddOns } from "@/hooks/use-add-on";
import { ADD_ON_KIND_LABELS } from "@/lib/catalogue";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AddOnItem } from "@/types/add-on";
import { ADD_ON_KINDS, type AddOnKind } from "@/validators/add-on.validator";
import { AddOnFormModal } from "./add-on-form-modal";

const COLUMNS = "lg:grid-cols-[minmax(0,2fr)_7rem_7rem_minmax(0,1.5fr)_6rem_6rem]";

type Modal = { kind: "create" } | { kind: "edit"; addOn: AddOnItem } | null;

export function AddOnManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<AddOnKind | "">("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<AddOnItem | null>(null);

  const addOns = useGetAddOns({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    kind: kind || undefined,
  });
  const deleteAddOn = useDeleteAddOn();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function confirmDelete() {
    if (!toDelete) return;
    const lastOnPage = addOns.data?.items.length === 1 && page > 1;

    deleteAddOn.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        deleteAddOn.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteAddOn.reset();
  }

  let content: ReactNode;
  if (addOns.isPending) {
    content = <TableSkeleton />;
  } else if (addOns.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{addOns.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => addOns.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (addOns.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search || kind ? "No add-ons match" : "No add-ons yet"}
        description={
          search || kind
            ? "Nothing matches these filters."
            : "Add the cases, chargers and cover offered alongside a device."
        }
      />
    );
  } else {
    const { items, total } = addOns.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    const deletingId = deleteAddOn.isPending ? deleteAddOn.variables : undefined;

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((addOn) => (
              <li key={addOn.id} className="border-b border-line last:border-b-0">
                <AddOnRow
                  addOn={addOn}
                  deleting={deletingId === addOn.id}
                  onEdit={() => setModal({ kind: "edit", addOn })}
                  onDelete={() => setToDelete(addOn)}
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
      title="Add-ons"
      description="Optional extras offered alongside a device: cases, chargers, extended cover."
      actions={
        <Button size="sm" onClick={() => setModal({ kind: "create" })}>
          Add add-on
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search add-ons by name"
          aria-label="Search add-ons"
          className="h-10 sm:w-80"
        />
        <Select
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as AddOnKind | "");
            setPage(1);
          }}
          aria-label="Filter by kind"
          className="h-10 sm:w-44"
        >
          <option value="">All kinds</option>
          {ADD_ON_KINDS.map((value) => (
            <option key={value} value={value}>
              {ADD_ON_KIND_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}

      {modal && (
        <AddOnFormModal
          addOn={modal.kind === "edit" ? modal.addOn : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "add-on"}?`}
        description="It stops being offered on every product. Turn it off instead to keep the record."
        confirmLabel="Delete add-on"
        error={deleteAddOn.isError ? deleteAddOn.error.message : undefined}
        loading={deleteAddOn.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function AddOnRow({
  addOn,
  deleting,
  onEdit,
  onDelete,
}: {
  addOn: AddOnItem;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const offeredOn = addOn.appliesToAll
    ? "Every product"
    : addOn.categories.map((category) => category.name).join(", ");

  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS, deleting && "opacity-50")}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{addOn.name}</p>
        {addOn.note && <p className="mt-0.5 truncate text-xs text-ink-muted">{addOn.note}</p>}
      </div>
      <p className="text-sm text-ink-secondary">{ADD_ON_KIND_LABELS[addOn.kind]}</p>
      <p className="text-sm tabular-nums text-ink-secondary">{formatMoney(addOn.price)}</p>
      <p className="truncate text-sm text-ink-secondary" title={offeredOn}>
        {offeredOn}
      </p>
      <div>
        <Badge variant={addOn.active ? "accent" : "outline"} className="px-2 py-1 text-[0.625rem]">
          {addOn.active ? "On" : "Off"}
        </Badge>
      </div>
      <RowActions name={addOn.name} disabled={deleting} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Add-on</p>
      <p className="eyebrow">Kind</p>
      <p className="eyebrow">Price</p>
      <p className="eyebrow">Offered on</p>
      <p className="eyebrow">Status</p>
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
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
