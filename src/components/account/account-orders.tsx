"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OrderStatus } from "@/types";
import { getOrders } from "@/lib/account-data";
import { cn } from "@/lib/utils";
import { AccountShell } from "./account-shell";
import { OrderSummaryCard } from "./order-summary-card";

/**
 * AccountOrders — the /account/orders list.
 *
 * Client component because filtering is a UI concern rather than a
 * routed state — no need to burn a URL segment per tab.
 */

type Filter = "all" | "active" | "delivered" | "cancelled" | "returned";

const FILTERS: { id: Filter; label: string; matches: (s: OrderStatus) => boolean }[] = [
  { id: "all", label: "All", matches: () => true },
  {
    id: "active",
    label: "Active",
    matches: (s) => s === "processing" || s === "shipped",
  },
  { id: "delivered", label: "Delivered", matches: (s) => s === "delivered" },
  { id: "cancelled", label: "Cancelled", matches: (s) => s === "cancelled" },
  { id: "returned", label: "Returned", matches: (s) => s === "returned" },
];

export function AccountOrders() {
  const [filter, setFilter] = useState<Filter>("all");
  const orders = useMemo(() => getOrders(), []);
  const matcher = FILTERS.find((f) => f.id === filter)!.matches;
  const visible = orders.filter((o) => matcher(o.status));

  return (
    <AccountShell
      title="My orders"
      subtitle="Every order you have placed with Rewire. Filter by status to focus."
    >
      <div className="mb-6 -mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto px-1 no-scrollbar">
        {FILTERS.map((f) => {
          const count = orders.filter((o) => f.matches(o.status)).length;
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 snap-start rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition-colors duration-(--duration-fast)",
                active
                  ? "border-ink bg-ink text-void"
                  : "border-line-strong text-ink-secondary hover:border-ink hover:text-ink",
              )}
            >
              {f.label}
              <span className={cn("ml-1.5 font-mono text-[0.6875rem] tabular-nums", active ? "text-void/70" : "text-ink-muted")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <div className="flex flex-col gap-3">
          {visible.map((order) => (
            <OrderSummaryCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-10 text-center">
          <p className="text-[1rem] font-medium text-ink">Nothing in this view</p>
          <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-ink-secondary">
            No orders match this filter yet. Switch to <button
              type="button"
              onClick={() => setFilter("all")}
              className="text-ink underline underline-offset-4 hover:text-accent"
            >
              All orders
            </button>{" "}
            or start browsing.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-accent hover:text-accent"
          >
            Continue shopping
          </Link>
        </div>
      )}
    </AccountShell>
  );
}
