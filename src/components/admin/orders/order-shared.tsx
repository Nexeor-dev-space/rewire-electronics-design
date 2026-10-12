import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ADMIN_ROOT } from "@/lib/admin-nav";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusTone,
  type OrderStatus,
  type OrderStatusTone,
  type PaymentStatus,
} from "@/lib/orders";

const BADGE_CLASS = "px-2 py-1 text-[0.625rem]";

const TONE_VARIANTS: Record<OrderStatusTone, BadgeProps["variant"]> = {
  live: "live",
  warn: "warn",
  muted: "outline",
  danger: "soldOut",
};

const PAYMENT_VARIANTS: Record<PaymentStatus, BadgeProps["variant"]> = {
  UNPAID: "outline",
  PAID: "live",
  PARTIALLY_REFUNDED: "default",
  REFUNDED: "default",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={TONE_VARIANTS[orderStatusTone(status)]} className={BADGE_CLASS}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={PAYMENT_VARIANTS[status]} className={BADGE_CLASS}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ORDERS_ADMIN_PATH = `${ADMIN_ROOT}/orders`;

export function orderAdminHref(number: string): string {
  return `${ORDERS_ADMIN_PATH}/${encodeURIComponent(number)}`;
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
      <p className="text-sm text-ink-secondary">{message}</p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
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
  );
}
