"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { StatusPill } from "@/components/account/status-pill";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAdminReturns } from "@/hooks/use-return";
import { useGetStoreSettings } from "@/hooks/use-store-settings";
import { ADMIN_PAGE_SIZE, ADMIN_RETURNS_PATH, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatOrderDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  RETURN_REASON_META,
  RETURN_STATUSES,
  RETURN_STATUS_LABELS,
  returnStatusTone,
  type ReturnStatus,
} from "@/lib/returns";
import { cn } from "@/lib/utils";
import type { AdminReturnRow } from "@/types/return";
import { ReturnWindowDialog } from "./return-window-dialog";

const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_4rem_6rem_7rem_7rem]";

export function returnHref(number: string) {
  return `${ADMIN_RETURNS_PATH}/${number}`;
}

export function ReturnStatusPill({ status }: { status: ReturnStatus }) {
  return <StatusPill tone={returnStatusTone(status)}>{RETURN_STATUS_LABELS[status]}</StatusPill>;
}

export function ReturnManagement() {
  const access = useModuleAccess(PERMISSIONS.returns);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReturnStatus | "">("");
  const [page, setPage] = useState(1);
  const [editingWindow, setEditingWindow] = useState(false);

  const returns = useGetAdminReturns({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  let content: ReactNode;
  if (returns.isPending) {
    content = <TableSkeleton />;
  } else if (returns.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{returns.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => returns.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (returns.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search || status ? "No returns match" : "No returns yet"}
        description={
          search || status
            ? "Nothing matches these filters."
            : "Return requests customers raise from their account appear here."
        }
      />
    );
  } else {
    const { items, total } = returns.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((row) => (
              <li key={row.number} className="border-b border-line last:border-b-0">
                <ReturnRow row={row} />
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
      title="Returns"
      description="Return requests, their inspection outcome and refunds."
      actions={<ReturnWindowAction canEdit={access.edit} onEdit={() => setEditingWindow(true)} />}
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Return number, order number or email"
          aria-label="Search returns"
          className="h-10 sm:w-80"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ReturnStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 sm:w-44"
        >
          <option value="">All statuses</option>
          {RETURN_STATUSES.map((value) => (
            <option key={value} value={value}>
              {RETURN_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}

      {editingWindow && <ReturnWindowDialog onClose={() => setEditingWindow(false)} />}
    </AdminPage>
  );
}

function ReturnWindowAction({ canEdit, onEdit }: { canEdit: boolean; onEdit: () => void }) {
  const settings = useGetStoreSettings();

  if (settings.isPending) return <Skeleton className="h-9 w-44 rounded-full" />;
  if (settings.isError) {
    return (
      <Button variant="outline" size="sm" onClick={() => settings.refetch()}>
        Return window unavailable. Retry
      </Button>
    );
  }

  const label = `Return window: ${settings.data.returnWindowDays} days`;
  if (!canEdit) return <p className="text-sm text-ink-secondary">{label}</p>;

  return (
    <Button variant="outline" size="sm" onClick={onEdit}>
      {label}
    </Button>
  );
}

function ReturnRow({ row }: { row: AdminReturnRow }) {
  return (
    <Link
      href={returnHref(row.number)}
      className={cn(
        "grid gap-x-4 gap-y-1 px-5 py-4 transition-colors duration-(--duration-fast) hover:bg-surface-2 lg:items-center",
        COLUMNS,
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium text-ink">{row.number}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-ink-muted">{row.orderNumber}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{row.customerName || row.email}</p>
        {row.customerName && <p className="mt-0.5 truncate text-xs text-ink-muted">{row.email}</p>}
      </div>
      <p className="text-sm text-ink-secondary">{RETURN_REASON_META[row.reason].label}</p>
      <p className="text-sm tabular-nums text-ink-secondary">
        <span className="lg:hidden">Items: </span>
        {row.itemCount}
      </p>
      <p className="text-sm tabular-nums text-ink-secondary">{formatOrderDate(row.requestedAt)}</p>
      <p className="text-sm tabular-nums text-ink-secondary">
        {row.refundAmount === null ? "—" : formatMoney(row.refundAmount)}
      </p>
      <div>
        <ReturnStatusPill status={row.status} />
      </div>
    </Link>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Return</p>
      <p className="eyebrow">Customer</p>
      <p className="eyebrow">Reason</p>
      <p className="eyebrow">Items</p>
      <p className="eyebrow">Requested</p>
      <p className="eyebrow">Refund</p>
      <p className="eyebrow">Status</p>
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
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
