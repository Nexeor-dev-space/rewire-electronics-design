"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { StatusPill } from "@/components/account/status-pill";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetWarranties } from "@/hooks/use-warranty";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  ADMIN_PAGE_SIZE,
  ADMIN_WARRANTY_CLAIMS_PATH,
  ADMIN_WARRANTY_PATH,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  WARRANTY_CLAIM_STATUS_LABELS,
  WARRANTY_STATUSES,
  WARRANTY_STATUS_LABELS,
  claimStatusTone,
  warrantyStatusTone,
  type WarrantyClaimStatus,
  type WarrantyStatus,
} from "@/lib/warranty";
import type { AdminWarrantyRow } from "@/types/warranty";

const COLUMNS =
  "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_6rem_6rem_minmax(0,1fr)_7rem]";
const CLAIM_IN_PROGRESS_LABEL = "Claim in progress";
const NOT_SET = "—";

export function warrantyHref(id: string) {
  return `${ADMIN_WARRANTY_PATH}/${id}`;
}

export function warrantyEditHref(id: string) {
  return `${warrantyHref(id)}/edit`;
}

export function claimHref(number: string) {
  return `${ADMIN_WARRANTY_CLAIMS_PATH}/${number}`;
}

export function WarrantyStatusPill({ status }: { status: WarrantyStatus }) {
  return <StatusPill tone={warrantyStatusTone(status)}>{WARRANTY_STATUS_LABELS[status]}</StatusPill>;
}

export function ClaimStatusPill({ status }: { status: WarrantyClaimStatus }) {
  return <StatusPill tone={claimStatusTone(status)}>{WARRANTY_CLAIM_STATUS_LABELS[status]}</StatusPill>;
}

export function ClaimInProgressPill() {
  return <StatusPill tone="warn">{CLAIM_IN_PROGRESS_LABEL}</StatusPill>;
}

/** Small text action in the row, the same shape as the catalogue's icon buttons. */
export function RowLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </Link>
  );
}

export function WarrantyManagement() {
  const access = useModuleAccess(PERMISSIONS.warranty);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WarrantyStatus | "">("");
  const [page, setPage] = useState(1);

  const warranties = useGetWarranties({
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
  if (warranties.isPending) {
    content = <TableSkeleton />;
  } else if (warranties.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{warranties.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => warranties.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (warranties.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search || status ? "No warranties match" : "No warranties yet"}
        description={
          search || status
            ? "Nothing matches these filters."
            : "Every device on a confirmed order appears here. Its warranty starts when the order is delivered."
        }
      />
    );
  } else {
    const { items, total } = warranties.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((row) => (
              <li key={row.id} className="border-b border-line last:border-b-0">
                <WarrantyRow row={row} canEdit={access.edit} />
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
      title="Warranty & Claims"
      description="Every device sold, keyed by serial or IMEI, with its warranty dates and the claims raised against it."
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Serial / IMEI, product, customer or order"
          aria-label="Search warranties"
          className="h-10 sm:w-96"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as WarrantyStatus | "");
            setPage(1);
          }}
          aria-label="Filter by warranty status"
          className="h-10 sm:w-44"
        >
          <option value="">All statuses</option>
          {WARRANTY_STATUSES.map((value) => (
            <option key={value} value={value}>
              {WARRANTY_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}
    </AdminPage>
  );
}

function WarrantyRow({ row, canEdit }: { row: AdminWarrantyRow; canEdit: boolean }) {
  const name = row.serialNumber || row.productName;

  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS)}>
      <p className="min-w-0 break-all font-mono text-sm text-ink">
        {row.serialNumber || <span className="text-ink-muted">No serial</span>}
      </p>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{row.productName}</p>
        {row.variantLabel && <p className="mt-0.5 truncate text-xs text-ink-muted">{row.variantLabel}</p>}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{row.customerName || row.email}</p>
        {row.customerName && <p className="mt-0.5 truncate text-xs text-ink-muted">{row.email}</p>}
      </div>
      <p className="truncate font-mono text-xs text-ink-secondary">{row.orderNumber}</p>
      <p className="text-sm tabular-nums text-ink-secondary">
        <span className="lg:hidden">Starts: </span>
        {row.warrantyStartsAt ? formatOrderDate(row.warrantyStartsAt) : NOT_SET}
      </p>
      <p className="text-sm tabular-nums text-ink-secondary">
        <span className="lg:hidden">Expires: </span>
        {row.warrantyEndsAt ? formatOrderDate(row.warrantyEndsAt) : NOT_SET}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <WarrantyStatusPill status={row.status} />
        {row.claimInProgress && <ClaimInProgressPill />}
      </div>
      <div className="mt-2 flex gap-1.5 lg:mt-0 lg:justify-end">
        <RowLink href={warrantyHref(row.id)} label={`View warranty for ${name}`}>
          View
        </RowLink>
        {canEdit && (
          <RowLink href={warrantyEditHref(row.id)} label={`Edit warranty for ${name}`}>
            Edit
          </RowLink>
        )}
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Serial / IMEI</p>
      <p className="eyebrow">Product</p>
      <p className="eyebrow">Customer</p>
      <p className="eyebrow">Order</p>
      <p className="eyebrow">Starts</p>
      <p className="eyebrow">Expires</p>
      <p className="eyebrow">Status</p>
      <p className="eyebrow lg:text-right">Actions</p>
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
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
