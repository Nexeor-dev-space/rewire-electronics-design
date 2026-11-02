"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteRelease, useGetReleases } from "@/hooks/use-release";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import { RELEASE_STATUS_LABELS, type ReleaseStatus } from "@/lib/releases";
import { cn } from "@/lib/utils";
import type { AdminRelease } from "@/types/release";
import { ReleaseFormModal } from "./release-form-modal";

const COLUMNS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_11rem_11rem_6rem_6rem]";

const STATUS_VARIANTS: Record<ReleaseStatus, BadgeProps["variant"]> = {
  LIVE: "live",
  UPCOMING: "outline",
  ENDED: "soldOut",
  OFF: "default",
};

type Modal = { kind: "create" } | { kind: "edit"; release: AdminRelease } | null;

export function ReleaseManagement() {
  const access = useModuleAccess(PERMISSIONS.releases);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<AdminRelease | null>(null);

  const releases = useGetReleases({ page, pageSize: ADMIN_PAGE_SIZE, search: search || undefined });
  const deleteRelease = useDeleteRelease();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function confirmDelete() {
    if (!toDelete) return;
    const lastOnPage = releases.data?.items.length === 1 && page > 1;

    deleteRelease.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        deleteRelease.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteRelease.reset();
  }

  let content: ReactNode;
  if (releases.isPending) {
    content = <TableSkeleton />;
  } else if (releases.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{releases.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => releases.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (releases.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search ? "No releases match" : "No releases yet"}
        description={
          search ? "Nothing matches this search." : "Add a release to put a product on sale for a set window."
        }
      />
    );
  } else {
    const { items, total } = releases.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    const deletingId = deleteRelease.isPending ? deleteRelease.variables : undefined;

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((release) => (
              <li key={release.id} className="border-b border-line last:border-b-0">
                <ReleaseRow
                  release={release}
                  deleting={deletingId === release.id}
                  onEdit={access.edit ? () => setModal({ kind: "edit", release }) : undefined}
                  onDelete={access.delete ? () => setToDelete(release) : undefined}
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
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </nav>
        )}
      </>
    );
  }

  return (
    <AdminPage
      title="Releases"
      description="Products put on sale for a set window. The live one shows on the dashboard."
      actions={
        access.create && (
          <Button size="sm" onClick={() => setModal({ kind: "create" })}>
            Add release
          </Button>
        )
      }
    >
      <div className="mb-5">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by title"
          aria-label="Search releases"
          className="h-10 sm:w-80"
        />
      </div>

      {content}

      {modal && (
        <ReleaseFormModal
          release={modal.kind === "edit" ? modal.release : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.title ?? "release"}?`}
        description="The release leaves the dashboard and this list. This can't be undone."
        confirmLabel="Delete release"
        error={deleteRelease.isError ? deleteRelease.error.message : undefined}
        loading={deleteRelease.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function ReleaseRow({
  release,
  deleting,
  onEdit,
  onDelete,
}: {
  release: AdminRelease;
  deleting: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS, deleting && "opacity-50")}>
      <p className="truncate text-sm font-medium text-ink">{release.title}</p>
      <p className="truncate text-sm text-ink-secondary">{release.product.name}</p>
      <p className="text-sm tabular-nums text-ink-secondary">{formatStoreDateTime(release.startsAt)}</p>
      <p className="text-sm tabular-nums text-ink-secondary">
        {release.endsAt ? formatStoreDateTime(release.endsAt) : "No end"}
      </p>
      <div>
        <Badge variant={STATUS_VARIANTS[release.status]} className="px-2 py-1 text-[0.625rem]">
          {RELEASE_STATUS_LABELS[release.status]}
        </Badge>
      </div>
      <RowActions name={release.title} disabled={deleting} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Title</p>
      <p className="eyebrow">Product</p>
      <p className="eyebrow">Starts</p>
      <p className="eyebrow">Ends</p>
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
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
