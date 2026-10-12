"use client";

import { useState } from "react";
import Link from "next/link";
import { useGetMe } from "@/hooks/use-auth";
import { useGetAccountOrders } from "@/hooks/use-order";
import { ACCOUNT_RECENT_ORDERS_LIMIT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccountShell } from "./account-shell";
import { OrderSummaryCard, OrderSummaryCardSkeleton } from "./order-summary-card";

const GUEST_ORDERS_NOTICE = "Orders you placed as a guest appear once you verify your email.";

export function AccountOrders() {
  const [page, setPage] = useState(1);
  const orders = useGetAccountOrders(page);
  const me = useGetMe();

  return (
    <AccountShell title="My orders" subtitle="Every order you have placed with Rewire, newest first.">
      {me.data && !me.data.emailVerified && (
        <p role="status" className="mb-6 rounded-xl border border-line bg-surface-2 px-5 py-4 text-[0.875rem] text-ink-secondary">
          {GUEST_ORDERS_NOTICE}
        </p>
      )}
      <OrdersBody orders={orders} page={page} onPage={setPage} />
    </AccountShell>
  );
}

function OrdersBody({
  orders,
  page,
  onPage,
}: {
  orders: ReturnType<typeof useGetAccountOrders>;
  page: number;
  onPage: (page: number) => void;
}) {
  if (orders.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: ACCOUNT_RECENT_ORDERS_LIMIT }, (_, index) => (
          <OrderSummaryCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (orders.isError) {
    return (
      <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-sm text-ink-secondary">{orders.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => orders.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { items, total, pageSize } = orders.data;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-10 text-center">
        <p className="text-[1rem] font-medium text-ink">No orders yet</p>
        <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-ink-secondary">
          Anything you buy will land here, with its delivery progress and tracking.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-accent hover:text-accent"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <div
        aria-busy={orders.isPlaceholderData}
        className={cn(
          "flex flex-col gap-3 transition-opacity duration-(--duration-fast)",
          orders.isPlaceholderData && "opacity-60",
        )}
      >
        {items.map((order) => (
          <OrderSummaryCard key={order.number} order={order} />
        ))}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </nav>
      )}
    </>
  );
}
