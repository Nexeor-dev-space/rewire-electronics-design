"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import {
  LoadError,
  OrderStatusBadge,
  Pager,
  formatOrderDate,
  orderAdminHref,
} from "@/components/admin/orders/order-shared";
import { GuestBadge } from "@/components/admin/shared/guest-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetFulfilmentOrders, useUpdateFulfilment } from "@/hooks/use-order";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE, TRACKING_NUMBER_MAX_LENGTH } from "@/lib/constants";
import { DELIVERY_METHOD_LABELS } from "@/lib/delivery";
import { emirateLabel } from "@/lib/emirates";
import {
  FULFILMENT_QUEUE_STATUSES,
  FULFILMENT_TARGET_STATUSES,
  ORDER_STATUS_LABELS,
  type FulfilmentQueueStatus,
  type FulfilmentTargetStatus,
  type OrderStatus,
} from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { AdminOrderRow } from "@/types/order";

const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_8rem_minmax(0,1.8fr)]";

function nextFulfilmentStatus(status: OrderStatus): FulfilmentTargetStatus | null {
  const index = FULFILMENT_QUEUE_STATUSES.indexOf(status as FulfilmentQueueStatus);
  return index === -1 ? null : FULFILMENT_TARGET_STATUSES[index];
}

export function FulfilmentQueue() {
  const [status, setStatus] = useState<FulfilmentQueueStatus | "">("");
  const [page, setPage] = useState(1);
  const { view: canViewOrders } = useModuleAccess(PERMISSIONS.orders);
  const { edit: canEdit } = useModuleAccess(PERMISSIONS.fulfilment);

  const queue = useGetFulfilmentOrders({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    status: status || undefined,
  });

  let content: ReactNode;
  if (queue.isPending) {
    content = <TableSkeleton />;
  } else if (queue.isError) {
    content = <LoadError message={queue.error.message} onRetry={() => queue.refetch()} />;
  } else if (queue.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={status ? "Nothing at this stage" : "The queue is clear"}
        description={
          status
            ? `No orders are ${ORDER_STATUS_LABELS[status].toLowerCase()} right now.`
            : "Confirmed orders appear here, oldest first, until they are delivered."
        }
      />
    );
  } else {
    const { items, total } = queue.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((order) => (
              <li key={order.number} className="border-b border-line last:border-b-0">
                <QueueRow
                  key={`${order.status}|${order.trackingNumber}`}
                  order={order}
                  canEdit={canEdit}
                  linkToOrder={canViewOrders}
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
      title="Fulfilment"
      description="Confirmed orders, oldest first. Add the tracking number and move each one on to Processing, Dispatched and Delivered."
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as FulfilmentQueueStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 sm:w-48"
        >
          <option value="">Whole queue</option>
          {FULFILMENT_QUEUE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}
    </AdminPage>
  );
}

function QueueRow({
  order,
  canEdit,
  linkToOrder,
}: {
  order: AdminOrderRow;
  canEdit: boolean;
  linkToOrder: boolean;
}) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber);
  const [error, setError] = useState<string | undefined>();
  const updateFulfilment = useUpdateFulfilment();
  const next = nextFulfilmentStatus(order.status);
  const trackingChanged = trackingNumber !== order.trackingNumber;

  function save(status?: FulfilmentTargetStatus) {
    setError(undefined);
    updateFulfilment.mutate(
      {
        number: order.number,
        ...(status ? { status } : {}),
        ...(trackingChanged ? { trackingNumber } : {}),
      },
      {
        onError: (failure) => {
          const fields = apiFieldErrors(failure);
          setError(fields.trackingNumber?.[0] ?? fields.status?.[0] ?? failure.message);
        },
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save();
  }

  const moving = updateFulfilment.isPending && updateFulfilment.variables?.status !== undefined;
  const saving = updateFulfilment.isPending && updateFulfilment.variables?.status === undefined;

  return (
    <div className={cn("grid gap-x-4 gap-y-2 px-5 py-4 lg:items-center", COLUMNS)}>
      <div className="min-w-0">
        {linkToOrder ? (
          <Link
            href={orderAdminHref(order.number)}
            className="font-mono text-sm font-medium text-ink underline-offset-4 hover:underline"
          >
            {order.number}
          </Link>
        ) : (
          <p className="font-mono text-sm font-medium text-ink">{order.number}</p>
        )}
        <time dateTime={order.placedAt} className="mt-0.5 block text-xs text-ink-muted">
          {formatOrderDate(order.placedAt)}
        </time>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm text-ink">
          <span className="truncate">{order.customerName}</span>
          {order.placedAsGuest && <GuestBadge />}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {order.city}, {emirateLabel(order.emirate)} · {DELIVERY_METHOD_LABELS[order.deliveryMethod]}
        </p>
      </div>
      <div>
        <OrderStatusBadge status={order.status} />
      </div>
      {canEdit ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2">
            <Input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              maxLength={TRACKING_NUMBER_MAX_LENGTH}
              placeholder="Tracking number"
              aria-label={`Tracking number for ${order.number}`}
              aria-invalid={Boolean(error) || undefined}
              className="h-10 min-w-40 flex-1 font-mono"
            />
            {trackingChanged && (
              <Button type="submit" variant="outline" size="sm" loading={saving} disabled={updateFulfilment.isPending}>
                Save
              </Button>
            )}
            {next && (
              <Button
                type="button"
                size="sm"
                loading={moving}
                disabled={updateFulfilment.isPending}
                onClick={() => save(next)}
              >
                Move to {ORDER_STATUS_LABELS[next]}
              </Button>
            )}
          </div>
          <FieldError>{error}</FieldError>
        </form>
      ) : (
        <p className="font-mono text-sm text-ink-secondary">{order.trackingNumber || "No tracking number"}</p>
      )}
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Order</p>
      <p className="eyebrow">Customer</p>
      <p className="eyebrow">Status</p>
      <p className="eyebrow">Tracking</p>
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
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
