"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { GuestBadge } from "@/components/admin/shared/guest-badge";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAdminOrders } from "@/hooks/use-order";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { AdminOrderRow } from "@/types/order";
import {
  LoadError,
  OrderStatusBadge,
  Pager,
  PaymentStatusBadge,
  formatOrderDate,
  orderAdminHref,
} from "./order-shared";

const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_9rem_minmax(0,1fr)_7rem]";

export function OrderManagement() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(1);

  const orders = useGetAdminOrders({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const filtered = Boolean(search || status || paymentStatus);

  let content: ReactNode;
  if (orders.isPending) {
    content = <TableSkeleton />;
  } else if (orders.isError) {
    content = <LoadError message={orders.error.message} onRetry={() => orders.refetch()} />;
  } else if (orders.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={filtered ? "No orders match" : "No orders yet"}
        description={filtered ? "Nothing matches these filters." : "Orders appear here as shoppers check out."}
      />
    );
  } else {
    const { items, total } = orders.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((order) => (
              <li key={order.number} className="border-b border-line last:border-b-0">
                <OrderRow order={order} />
              </li>
            ))}
          </ul>
        </div>

        <Pager page={page} pages={pages} onPage={setPage} />
      </>
    );
  }

  return (
    <AdminPage title="Orders" description="Every order and its line items, payment state and customer.">
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by number, email or last name"
          aria-label="Search orders"
          className="h-10 sm:w-80"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OrderStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 sm:w-48"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          value={paymentStatus}
          onChange={(event) => {
            setPaymentStatus(event.target.value as PaymentStatus | "");
            setPage(1);
          }}
          aria-label="Filter by payment status"
          className="h-10 sm:w-48"
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PAYMENT_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}
    </AdminPage>
  );
}

function OrderRow({ order }: { order: AdminOrderRow }) {
  return (
    <Link
      href={orderAdminHref(order.number)}
      className={cn(
        "grid gap-x-4 gap-y-1 px-5 py-4 transition-colors duration-(--duration-fast) hover:bg-surface-2 lg:items-center",
        COLUMNS,
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium text-ink">{order.number}</p>
        <time dateTime={order.placedAt} className="mt-0.5 block text-xs text-ink-muted">
          {formatOrderDate(order.placedAt)}
        </time>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm text-ink">
          <span className="truncate">{order.customerName}</span>
          {order.placedAsGuest && <GuestBadge />}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{order.email}</p>
      </div>
      <div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PaymentStatusBadge status={order.paymentStatus} />
        <span className="text-xs text-ink-muted">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
      </div>
      <p className="text-sm tabular-nums text-ink lg:text-right">{formatMoney(order.total)}</p>
    </Link>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Order</p>
      <p className="eyebrow">Customer</p>
      <p className="eyebrow">Status</p>
      <p className="eyebrow">Payment</p>
      <p className="eyebrow lg:text-right">Total</p>
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
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-16 lg:ml-auto" />
        </div>
      ))}
    </div>
  );
}
