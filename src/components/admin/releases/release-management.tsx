"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { LoadError, Pager } from "@/components/admin/orders/order-shared";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useChangeReleaseState, useDeleteRelease, useGetReleases } from "@/hooks/use-release";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import {
  RELEASE_SORTS,
  RELEASE_SORT_LABELS,
  RELEASE_STATE_ACTION_LABELS,
  RELEASE_STATUSES,
  RELEASE_STATUS_LABELS,
  canChangeState,
  canDeleteRelease,
  type ReleaseSort,
  type ReleaseStatus,
} from "@/lib/releases";
import { cn } from "@/lib/utils";
import type { AdminReleaseRow } from "@/types/release";
import { ReleaseFormModal } from "./release-form-modal";
import { ReleaseBadges, releaseAdminHref } from "./release-shared";

const COLUMNS =
  "lg:grid-cols-[minmax(0,1.4fr)_10rem_4.5rem_4.5rem_4.5rem_4.5rem_minmax(0,7rem)_minmax(0,9rem)]";

export function ReleaseManagement() {
  const router = useRouter();
  const access = useModuleAccess(PERMISSIONS.releases);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReleaseStatus | "">("");
  const [sort, setSort] = useState<ReleaseSort>(RELEASE_SORTS[0]);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminReleaseRow | null>(null);

  const releases = useGetReleases({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
    sort,
  });
  const deleteRelease = useDeleteRelease();
  const changeState = useChangeReleaseState();

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

  const filtered = Boolean(search || status);

  let content: ReactNode;
  if (releases.isPending) {
    content = <TableSkeleton />;
  } else if (releases.isError) {
    content = <LoadError message={releases.error.message} onRetry={() => releases.refetch()} />;
  } else if (releases.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={filtered ? "No releases match" : "No releases yet"}
        description={
          filtered ? "Nothing matches these filters." : "Create a release to put stock on sale for a set window."
        }
      />
    );
  } else {
    const { items, total } = releases.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    const deletingId = deleteRelease.isPending ? deleteRelease.variables : undefined;
    const publishingId = changeState.isPending ? changeState.variables.id : undefined;

    content = (
      <>
        {changeState.isError && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {changeState.error.message}
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((release) => (
              <li key={release.id} className="border-b border-line last:border-b-0">
                <ReleaseRow
                  release={release}
                  busy={deletingId === release.id || publishingId === release.id}
                  onView={() => router.push(releaseAdminHref(release.id))}
                  onPublish={
                    access.edit && canChangeState(release.status, "PUBLISH")
                      ? () => changeState.mutate({ id: release.id, action: "PUBLISH" })
                      : undefined
                  }
                  onDelete={
                    access.delete && canDeleteRelease(release.status) ? () => setToDelete(release) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </div>

        <Pager page={page} pages={pages} onPage={setPage} />
      </>
    );
  }

  return (
    <AdminPage
      title="Releases"
      description="Limited drops with their own stock allocation and opening window."
      actions={
        access.create && (
          <Button size="sm" onClick={() => setCreating(true)}>
            New release
          </Button>
        )
      }
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by title or edition"
          aria-label="Search releases"
          className="h-10 sm:w-80"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ReleaseStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 sm:w-48"
        >
          <option value="">All statuses</option>
          {RELEASE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {RELEASE_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as ReleaseSort);
            setPage(1);
          }}
          aria-label="Sort releases"
          className="h-10 sm:w-56"
        >
          {RELEASE_SORTS.map((value) => (
            <option key={value} value={value}>
              {RELEASE_SORT_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}

      {creating && <ReleaseFormModal onClose={() => setCreating(false)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.title ?? "release"}?`}
        description="The release and its allocations are removed. This can't be undone."
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
  busy,
  onView,
  onPublish,
  onDelete,
}: {
  release: AdminReleaseRow;
  busy: boolean;
  onView: () => void;
  onPublish?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS, busy && "opacity-50")}>
      <div className="min-w-0">
        <Link
          href={releaseAdminHref(release.id)}
          className="block truncate text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          {release.title}
        </Link>
        {release.edition && <p className="truncate text-xs text-ink-muted">{release.edition}</p>}
      </div>
      <p className="text-sm tabular-nums text-ink-secondary">{formatStoreDateTime(release.startsAt)}</p>
      <Figure label="Products" value={release.productCount} />
      <Figure label="Allocated" value={release.allocated} />
      <Figure label="Sold" value={release.sold} />
      <Figure label="Remaining" value={release.remaining} />
      <ReleaseBadges status={release.status} hidden={release.hidden} />
      <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
        {onPublish && (
          <Button variant="outline" size="sm" disabled={busy} onClick={onPublish} className="mt-2 lg:mt-0">
            {RELEASE_STATE_ACTION_LABELS.PUBLISH}
          </Button>
        )}
        <RowActions name={release.title} disabled={busy} onEdit={onView} onDelete={onDelete} />
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <p className="text-sm tabular-nums text-ink-secondary">
      <span className="text-ink-muted lg:sr-only">{label}: </span>
      {value}
    </p>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Name</p>
      <p className="eyebrow">Opening</p>
      <p className="eyebrow">Products</p>
      <p className="eyebrow">Allocated</p>
      <p className="eyebrow">Sold</p>
      <p className="eyebrow">Remaining</p>
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
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
