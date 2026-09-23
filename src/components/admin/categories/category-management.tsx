"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions, Thumbnail } from "@/components/admin/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteCategory, useGetCategories } from "@/hooks/use-category";
import { cn } from "@/lib/utils";
import type { CategoryNode, CategorySummary } from "@/types/category";
import { CategoryFormModal } from "./category-form-modal";

/**
 * The category tree. The list endpoint returns a page of parents each
 * carrying its children, so the mapping is rendered rather than inferred —
 * children sit indented under the parent they belong to.
 *
 * Pagination walks parents, not categories, which is why the counter says so.
 */

const PAGE_SIZE = 20;
const COLUMNS = "lg:grid-cols-[minmax(0,2fr)_7rem_minmax(0,1fr)_6rem]";

type Modal = { kind: "create" } | { kind: "edit"; id: string } | null;

export function CategoryManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<CategorySummary | null>(null);

  const categories = useGetCategories({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
  });
  const deleteCategory = useDeleteCategory();

  // Search once typing pauses.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
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
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((parent) => (
              <CategoryGroup
                key={parent.id}
                parent={parent}
                deletingId={deleteCategory.isPending ? (deleteCategory.variables ?? null) : null}
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
            : "This removes the category. Products already using it are not changed."
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
  deletingId,
  onEdit,
  onDelete,
}: {
  parent: CategoryNode;
  deletingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (category: CategorySummary) => void;
}) {
  return (
    <li className="border-b border-line last:border-b-0">
      <CategoryRow
        category={parent}
        childCount={parent.childCount}
        deleting={deletingId === parent.id}
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
                deleting={deletingId === child.id}
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
  deleting,
  onEdit,
  onDelete,
}: {
  category: CategorySummary;
  childCount?: number;
  nested?: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center",
        COLUMNS,
        nested && "lg:pl-12",
        deleting && "opacity-50",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Thumbnail url={category.imageUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{category.name}</p>
          {childCount !== undefined && childCount > 0 && (
            <p className="mt-0.5 text-xs text-ink-muted">
              {childCount} {childCount === 1 ? "subcategory" : "subcategories"}
            </p>
          )}
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

      <time dateTime={category.updatedAt} className="text-sm text-ink-secondary">
        {new Date(category.updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </time>

      <RowActions
        name={category.name}
        disabled={deleting}
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
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
