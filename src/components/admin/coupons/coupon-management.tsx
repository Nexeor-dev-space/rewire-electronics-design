"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteCoupon, useGetCoupons } from "@/hooks/use-coupon";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import type { CouponStatus } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import type { AdminCoupon } from "@/types/coupon";
import { CouponFormModal } from "./coupon-form-modal";

const COLUMNS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7rem_7rem_7rem_6rem]";

const STATUS_LABELS: Record<CouponStatus, string> = {
  ACTIVE: "Active",
  SCHEDULED: "Scheduled",
  EXPIRED: "Expired",
  DISABLED: "Disabled",
  USED_UP: "Used up",
};

const STATUS_VARIANTS: Record<CouponStatus, BadgeProps["variant"]> = {
  ACTIVE: "live",
  SCHEDULED: "outline",
  EXPIRED: "soldOut",
  DISABLED: "default",
  USED_UP: "warn",
};

type Modal = { kind: "create" } | { kind: "edit"; coupon: AdminCoupon } | null;
type ActiveFilter = "" | "true" | "false";

export function CouponManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<AdminCoupon | null>(null);

  const coupons = useGetCoupons({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    active: active || undefined,
  });
  const deleteCoupon = useDeleteCoupon();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function confirmDelete() {
    if (!toDelete) return;
    const lastOnPage = coupons.data?.items.length === 1 && page > 1;

    deleteCoupon.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        deleteCoupon.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteCoupon.reset();
  }

  let content: ReactNode;
  if (coupons.isPending) {
    content = <TableSkeleton />;
  } else if (coupons.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{coupons.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => coupons.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (coupons.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search || active ? "No codes match" : "No discount codes yet"}
        description={
          search || active
            ? "Nothing matches these filters."
            : "Create a code shoppers can enter at checkout for a discount."
        }
      />
    );
  } else {
    const { items, total } = coupons.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    const deletingId = deleteCoupon.isPending ? deleteCoupon.variables : undefined;

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((coupon) => (
              <li key={coupon.id} className="border-b border-line last:border-b-0">
                <CouponRow
                  coupon={coupon}
                  deleting={deletingId === coupon.id}
                  onEdit={() => setModal({ kind: "edit", coupon })}
                  onDelete={() => setToDelete(coupon)}
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
      title="Discount Codes"
      description="Coupon codes, their conditions and redemption limits."
      actions={
        <Button size="sm" onClick={() => setModal({ kind: "create" })}>
          Add discount code
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by code"
          aria-label="Search discount codes"
          className="h-10 sm:w-80"
        />
        <Select
          value={active}
          onChange={(event) => {
            setActive(event.target.value as ActiveFilter);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 sm:w-44"
        >
          <option value="">All codes</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      {content}

      {modal && (
        <CouponFormModal
          coupon={modal.kind === "edit" ? modal.coupon : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.code ?? "code"}?`}
        description="Carts that already applied it lose the discount. This can't be undone."
        confirmLabel="Delete code"
        error={deleteCoupon.isError ? deleteCoupon.error.message : undefined}
        loading={deleteCoupon.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function discountLabel(coupon: AdminCoupon): string {
  return coupon.type === "PERCENT" ? `${coupon.value}% off` : `${formatMoney(coupon.value)} off`;
}

function CouponRow({
  coupon,
  deleting,
  onEdit,
  onDelete,
}: {
  coupon: AdminCoupon;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS, deleting && "opacity-50")}>
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium text-ink">{coupon.code}</p>
        {coupon.description && (
          <p className="mt-0.5 truncate text-xs text-ink-muted">{coupon.description}</p>
        )}
      </div>
      <p className="text-sm text-ink-secondary">{discountLabel(coupon)}</p>
      <p className="text-sm tabular-nums text-ink-secondary">
        {coupon.minOrderAmount > 0 ? formatMoney(coupon.minOrderAmount) : "None"}
      </p>
      <p className="text-sm tabular-nums text-ink-secondary">
        {coupon.redemptionCount} / {coupon.usageLimit ?? "∞"}
      </p>
      <div>
        <Badge variant={STATUS_VARIANTS[coupon.status]} className="px-2 py-1 text-[0.625rem]">
          {STATUS_LABELS[coupon.status]}
        </Badge>
      </div>
      <RowActions name={coupon.code} disabled={deleting} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Code</p>
      <p className="eyebrow">Discount</p>
      <p className="eyebrow">Minimum</p>
      <p className="eyebrow">Redeemed</p>
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
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
