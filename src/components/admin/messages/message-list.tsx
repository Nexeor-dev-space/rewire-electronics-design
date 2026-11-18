"use client";

import { AdminEmptyState } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMessages } from "@/hooks/use-message";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_STATUS_LABELS,
  MESSAGE_TRIGGER_LABELS,
  type MessageStatus,
} from "@/lib/messaging";
import { cn } from "@/lib/utils";
import type { MessageFilters, MessageLogEntry } from "@/types/message";

const COLUMNS = "lg:grid-cols-[9rem_minmax(0,1.1fr)_6rem_minmax(0,1.2fr)_6rem_minmax(0,1.6fr)]";

/**
 * A page of message history, newest first: the full log for Marketing Messages,
 * or one customer's messages when `filters.userId` is set. A failed or skipped
 * row shows why, which is what makes a missing message traceable.
 */
export function MessageList({
  filters,
  filtered,
  onPageChange,
}: {
  filters: MessageFilters;
  filtered: boolean;
  onPageChange: (page: number) => void;
}) {
  const messages = useGetMessages({ ...filters, pageSize: ADMIN_PAGE_SIZE });
  const page = filters.page ?? 1;

  if (messages.isPending) return <ListSkeleton />;

  if (messages.isError) {
    return (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{messages.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => messages.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { items, total } = messages.data;
  if (items.length === 0) {
    return (
      <AdminEmptyState
        title={filtered ? "No messages match" : "No messages yet"}
        description={
          filtered
            ? "Nothing matches these filters."
            : "Messages appear here as orders, releases, warranties and accounts trigger them."
        }
      />
    );
  }

  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-line">
        <ListHeader />
        <ul>
          {items.map((entry) => (
            <MessageRow key={entry.id} entry={entry} />
          ))}
        </ul>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </nav>
      )}
    </>
  );
}

function MessageRow({ entry }: { entry: MessageLogEntry }) {
  const detail = entry.reason || entry.subject;
  return (
    <li className="border-b border-line last:border-b-0">
      <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS)}>
        <time dateTime={entry.createdAt} className="text-sm tabular-nums text-ink-secondary">
          {formatWhen(entry.createdAt)}
        </time>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{MESSAGE_TRIGGER_LABELS[entry.trigger]}</p>
          {entry.refLabel && <p className="truncate text-xs text-ink-muted">{entry.refLabel}</p>}
        </div>
        <p className="text-sm text-ink-secondary">{MESSAGE_CHANNEL_LABELS[entry.channel]}</p>
        <p className="truncate text-sm text-ink-secondary">
          {entry.customerName ?? entry.recipient}
          {entry.customerName && <span className="ml-2 text-xs text-ink-muted">{entry.recipient}</span>}
        </p>
        <div>
          <Badge variant={statusVariant(entry.status)} className="px-2 py-1 text-[0.625rem]">
            {MESSAGE_STATUS_LABELS[entry.status]}
          </Badge>
        </div>
        <p className={cn("text-sm", entry.reason ? "text-warn" : "text-ink-secondary")}>
          {detail || "—"}
          {entry.attempts > 1 && <span className="ml-2 text-xs text-ink-muted">{entry.attempts} attempts</span>}
        </p>
      </div>
    </li>
  );
}

function statusVariant(status: MessageStatus) {
  if (status === "SENT") return "live" as const;
  if (status === "FAILED") return "warn" as const;
  if (status === "SKIPPED") return "outline" as const;
  return "default" as const;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ListHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">When</p>
      <p className="eyebrow">Message</p>
      <p className="eyebrow">Channel</p>
      <p className="eyebrow">To</p>
      <p className="eyebrow">Status</p>
      <p className="eyebrow">Details</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      <ListHeader />
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className={cn("grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-44" />
        </div>
      ))}
    </div>
  );
}
