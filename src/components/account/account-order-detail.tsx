"use client";

import Link from "next/link";
import { useGetAccountOrder } from "@/hooks/use-order";
import { ApiError } from "@/lib/api/api-client";
import { ACCOUNT_ORDERS_PATH } from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import {
  OrderDetailBody,
  OrderDetailSkeleton,
  OrderStatusPill,
  orderEtaLabel,
} from "@/components/order/order-detail-body";
import { AccountShell } from "./account-shell";

export function AccountOrderDetail({ number }: { number: string }) {
  const order = useGetAccountOrder(number);
  const title = `Order ${number.toUpperCase()}`;

  if (order.isPending) {
    return (
      <AccountShell title={title}>
        <OrderDetailSkeleton />
      </AccountShell>
    );
  }

  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.body.code === "NOT_FOUND";
    return (
      <AccountShell title={notFound ? "Order not found" : title}>
        <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-[0.9375rem] text-ink-secondary">{order.error.message}</p>
          {notFound ? (
            <Link
              href={ACCOUNT_ORDERS_PATH}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-accent hover:text-accent"
            >
              See all orders
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="mt-5" onClick={() => order.refetch()}>
              Try again
            </Button>
          )}
        </div>
      </AccountShell>
    );
  }

  const data = order.data;

  return (
    <AccountShell
      title={`Order ${data.number}`}
      subtitle={`Placed ${formatOrderDate(data.placedAt)} · ${orderEtaLabel(data)}`}
      aside={
        <div className="flex flex-wrap items-center gap-3">
          <OrderStatusPill status={data.status} />
          <Link href={ACCOUNT_ORDERS_PATH} className="text-[0.8125rem] font-medium text-ink-secondary hover:text-ink">
            ← All orders
          </Link>
        </div>
      }
    >
      <OrderDetailBody
        order={data}
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong text-[0.875rem] font-medium text-ink transition-colors duration-(--duration-fast) hover:border-ink"
          >
            Download / view invoice
          </button>
        }
      />
    </AccountShell>
  );
}
