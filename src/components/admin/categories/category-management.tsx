"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions, Thumbnail } from "@/components/admin/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteCategory,
  useGetCategories,
  useSetCategoryStatus,
} from "@/hooks/use-category";
import { PRODUCT_STATUS_LABELS } from "@/lib/catalogue";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CategoryNode, CategorySummary } from "@/types/category";
import { CATEGORY_STATUSES, type CategoryStatus } from "@/validators/category.validator";
import { CategoryFormModal } from "./category-form-modal";

/**
 * The category tree. The list endpoint returns a page of parents each
 * carrying its children, so the mapping is rendered rather than inferred —
 * children sit indented under the parent they belong to.
 *
 * Pagination walks parents, not categories, which is why the counter says so.
 */

const COLUMNS = "lg:grid-cols-[minmax(0,2fr)_7rem_9rem_minmax(0,1fr)_6rem]";

type Modal = { kind: "create" } | { kind: "edit"; id: string } | null;

export function CategoryManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<CategorySummary | null>(null);

  const categories = useGetCategories({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
  });
  const deleteCategory = useDeleteCategory();
  const setCategoryStatus = useSetCategoryStatus();
  const busyId = setCategoryStatus.isPending ? setCategoryStatus.variables?.id : undefined;

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
    const lastOnPage = categories.data?.items.length === 1 && page > 1;

    deleteCategory.mutate(toDelete.id, {
      // Only a success closes the dialog. A refusal — a parent that still has
      // children — stays open and shows why, which is where the reader is.
      onSuccess: () => {
        setToDelete(null);
        deleteCategory.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteCategory.reset();
  }

  let content: ReactNode;
  if (categories.isPending) {
    content = <TableSkeleton />;
  } else if (categories.isError) {
    content = (
      <div
        role="alert"
        className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center"
      >
        <p className="text-sm text-ink-secondary">{categories.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => categories.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (categories.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search ? "No categories match" : "No categories yet"}
        description={
          search
            ? `Nothing matches “${search}”.`
            : "Add a parent category, then the categories that sit under it."
        }
      />
    );
  } else {
    const { items, total } = categories.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        {setCategoryStatus.isError && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {setCategoryStatus.error.message}
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((parent) => (
              <CategoryGroup
                key={parent.id}
                parent={parent}
                busyId={deleteCategory.isPending ? (deleteCategory.variables ?? busyId) : busyId}
                onStatusChange={(id, status) => setCategoryStatus.mutate({ id, status })}
                onEdit={(id) => setModal({ kind: "edit", id })}
                onDelete={setToDelete}
              />
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
      title="Categories"
      description="The category tree the storefront and the feeds both read. Two levels: a parent, and the categories that sit under it."
      actions={
        <Button size="sm" onClick={() => setModal({ kind: "create" })}>
          Add category
        </Button>
      }
    >
      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search categories by name"
        aria-label="Search categories"
        className="mb-5 h-10 sm:w-80"
      />

      {content}

      {modal && (
        <CategoryFormModal
          categoryId={modal.kind === "edit" ? modal.id : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "category"}?`}
        description={
          toDelete?.type === "parent"
            ? "Parent categories can only be deleted once nothing sits under them."
            : "This removes the category. Archive it instead to hide it and keep the record."
        }
        confirmLabel="Delete category"
        error={deleteCategory.isError ? deleteCategory.error.message : undefined}
        loading={deleteCategory.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function CategoryGroup({
  parent,
  busyId,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  parent: CategoryNode;
  busyId: string | undefined;
  onStatusChange: (id: string, status: CategoryStatus) => void;
  onEdit: (id: string) => void;
  onDelete: (category: CategorySummary) => void;
}) {
  return (
    <li className="border-b border-line last:border-b-0">
      <CategoryRow
        category={parent}
        childCount={parent.childCount}
        busy={busyId === parent.id}
        onStatusChange={(status) => onStatusChange(parent.id, status)}
        onEdit={() => onEdit(parent.id)}
        onDelete={() => onDelete(parent)}
      />

      {parent.children.length > 0 && (
        <ul className="border-t border-line bg-surface-2/40">
          {parent.children.map((child) => (
            <li key={child.id} className="border-b border-line last:border-b-0">
              <CategoryRow
                category={child}
                nested
                busy={busyId === child.id}
                onStatusChange={(status) => onStatusChange(child.id, status)}
                onEdit={() => onEdit(child.id)}
                onDelete={() => onDelete(child)}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CategoryRow({
  category,
  childCount,
  nested = false,
  busy,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  category: CategorySummary;
  childCount?: number;
  nested?: boolean;
  busy: boolean;
  onStatusChange: (status: CategoryStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const notes = [
    childCount ? `${childCount} ${childCount === 1 ? "subcategory" : "subcategories"}` : null,
    `Position ${category.sortOrder}`,
    !nested && !category.showInNav ? "Hidden from menus" : null,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center",
        COLUMNS,
        nested && "lg:pl-12",
        busy && "opacity-50",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Thumbnail url={category.imageUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{category.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{notes.join(" · ")}</p>
        </div>
      </div>

      <div>
        <Badge
          variant={category.type === "parent" ? "accent" : "outline"}
          className="px-2 py-1 text-[0.625rem]"
        >
          {category.type === "parent" ? "Parent" : "Child"}
        </Badge>
      </div>

      <Select
        value={category.status}
        disabled={busy}
        onChange={(event) => onStatusChange(event.target.value as CategoryStatus)}
        aria-label={`Status of ${category.name}`}
        className="h-9 text-xs"
      >
        {CATEGORY_STATUSES.map((value) => (
          <option key={value} value={value}>
            {PRODUCT_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>

      <time dateTime={category.updatedAt} className="text-sm text-ink-secondary">
        {new Date(category.updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </time>

      <RowActions
        name={category.name}
        disabled={busy}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

function TableHeader() {
  return (
    <div
      className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}
    >
      <p className="eyebrow">Category</p>
      <p className="eyebrow">Type</p>
      <p className="eyebrow">Status</p>
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
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
