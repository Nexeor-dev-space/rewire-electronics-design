import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { OrderDetail, OrderLine } from "@/types/order";
import { StatusPill } from "@/components/account/status-pill";
import { ACCOUNT_RETURNS_PATH } from "@/lib/constants";
import { formatOrderDate, formatOrderStamp } from "@/lib/dates";
import { DELIVERY_METHOD_LABELS, formatEta } from "@/lib/delivery";
import { emirateLabel } from "@/lib/emirates";
import { formatMoney } from "@/lib/money";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_LINK_NOTICE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  awaitsPaymentLink,
  orderStatusTone,
  type OrderStatus,
} from "@/lib/orders";
import { isReturnable } from "@/lib/returns";
import { CONDITION_META, GRADE_META, productHref } from "@/lib/shop";
import { cn } from "@/lib/utils";

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <StatusPill tone={orderStatusTone(status)}>{ORDER_STATUS_LABELS[status]}</StatusPill>;
}

export function orderEtaLabel(
  order: Pick<OrderDetail, "status" | "etaMinDays" | "etaMaxDays"> & { deliveredAt?: string | null },
) {
  if (order.deliveredAt) return `Delivered ${formatOrderDate(order.deliveredAt)}`;
  if (order.status === "DELIVERED" || order.status === "CANCELLED") return ORDER_STATUS_LABELS[order.status];
  return formatEta(order.etaMinDays, order.etaMaxDays);
}

function returnRequestHref(orderNumber: string, itemId?: string) {
  const query = new URLSearchParams(itemId ? { order: orderNumber, item: itemId } : { order: orderNumber });
  return `${ACCOUNT_RETURNS_PATH}?${query}`;
}

export function OrderDetailBody({
  order,
  actions,
  returnLinks = false,
}: {
  order: OrderDetail;
  actions?: ReactNode;
  returnLinks?: boolean;
}) {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:gap-10">
      <div className="flex flex-col gap-8">
        <OrderTimeline order={order} />
        <OrderLines order={order} returnLinks={returnLinks} />
      </div>

      <div className="flex flex-col gap-8">
        <DeliveryCard order={order} />
        <PaymentCard order={order} />
        <TotalsCard order={order} />
        {actions}
      </div>
    </div>
  );
}

function OrderTimeline({ order }: { order: OrderDetail }) {
  const notes = order.timeline.filter((step) => step.note);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 md:p-7">
      <h2 className="mb-6 text-[1.125rem] font-medium text-ink">
        {order.status === "CANCELLED" ? "Order timeline" : "Delivery progress"}
      </h2>

      <ol className="flex flex-col gap-4 sm:flex-row sm:gap-0">
        {order.timeline.map((step, index) => {
          const cancelled = step.key === "CANCELLED";
          return (
            <li key={step.key} className="relative sm:flex-1 sm:pr-4">
              <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                    !step.reached && "border-line-strong text-ink-muted",
                    step.reached && cancelled && "border-danger/60 bg-danger/10 text-danger",
                    step.reached && !cancelled && step.current && "border-accent bg-accent/15 text-accent",
                    step.reached && !cancelled && !step.current && "border-live/60 bg-live/15 text-live",
                  )}
                >
                  {step.reached ? (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3"
                    >
                      {cancelled ? <path d="m4.5 4.5 7 7m0-7-7 7" /> : <path d="m3 8 3.5 3.5L13 4.5" />}
                    </svg>
                  ) : (
                    <span className="text-[0.6875rem] font-medium tabular-nums">{index + 1}</span>
                  )}
                </span>
                <div>
                  <p
                    aria-current={step.current ? "step" : undefined}
                    className={cn("text-[0.9375rem] font-medium", step.reached ? "text-ink" : "text-ink-muted")}
                  >
                    {step.label}
                    <span className="sr-only">{step.reached ? ", done" : ", not yet"}</span>
                  </p>
                  {step.at && (
                    <p className="mt-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                      {formatOrderStamp(step.at)}
                    </p>
                  )}
                </div>
              </div>
              {index < order.timeline.length - 1 && (
                <div
                  aria-hidden
                  className={cn(
                    "absolute top-3 right-0 left-8 hidden h-px sm:block",
                    order.timeline[index + 1].reached ? "bg-live/40" : "bg-line",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {notes.length > 0 && (
        <ul className="mt-6 space-y-3 border-t border-line pt-6">
          {notes.map((step) => (
            <li key={step.key} className="flex items-start gap-4 text-[0.875rem]">
              <span
                aria-hidden
                className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", step.reached ? "bg-live" : "bg-warn")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink">{step.label}</p>
                  {step.at && (
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                      {formatOrderStamp(step.at)}
                    </p>
                  )}
                </div>
                <p className="mt-0.5 text-ink-secondary">{step.note}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderLines({ order, returnLinks }: { order: OrderDetail; returnLinks: boolean }) {
  const count = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const returnOpen = isReturnable(order, new Date());
  const canReturn = (line: OrderLine) => returnLinks && returnOpen && line.returnableQuantity > 0;

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-6 py-5">
        <h2 className="text-[1.125rem] font-medium text-ink">
          {count} item{count === 1 ? "" : "s"} in this order
        </h2>
        {returnOpen && order.returnableUntil && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
              Returnable until {formatOrderDate(order.returnableUntil)}
            </p>
            {order.lines.some(canReturn) && (
              <Link
                href={returnRequestHref(order.number)}
                className="text-[0.8125rem] font-medium text-ink hover:text-accent"
              >
                Request a return
              </Link>
            )}
          </div>
        )}
        {order.status === "DELIVERED" && !returnOpen && (
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Return window closed
          </p>
        )}
      </header>
      <ul>
        {order.lines.map((line, index) => (
          <OrderLineRow
            key={line.id}
            line={line}
            first={index === 0}
            returnHref={canReturn(line) ? returnRequestHref(order.number, line.id) : null}
          />
        ))}
      </ul>
    </section>
  );
}

function OrderLineRow({
  line,
  first,
  returnHref,
}: {
  line: OrderLine;
  first: boolean;
  returnHref: string | null;
}) {
  const details = [line.brand, line.storage, line.colour].filter(Boolean).join(" · ");

  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-5 p-6 sm:flex-nowrap sm:gap-6",
        !first && "border-t border-line",
      )}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-plate">
        {line.imageUrl && (
          <Image src={line.imageUrl} alt={line.imageAlt} fill sizes="96px" className="object-contain p-2" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link href={productHref({ slug: line.productSlug })} className="text-[1rem] font-medium text-ink hover:text-accent">
          {line.productName}
        </Link>
        {details && <p className="mt-1 text-[0.8125rem] text-ink-secondary">{details}</p>}
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted sm:grid-cols-3">
          <div>
            <dt>Condition</dt>
            <dd className="mt-0.5 text-ink">{CONDITION_META[line.condition].label}</dd>
          </div>
          {line.grade && (
            <div>
              <dt>Grade</dt>
              <dd className="mt-0.5 text-ink">{GRADE_META[line.grade].label}</dd>
            </div>
          )}
          <div>
            <dt>Qty</dt>
            <dd className="mt-0.5 text-ink">{line.quantity}</dd>
          </div>
        </dl>

        {line.addOns.length > 0 && (
          <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-3.5">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">Add-ons</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {line.addOns.map((addOn) => (
                <li
                  key={`${addOn.id ?? addOn.name}-${addOn.kind}`}
                  className="flex items-baseline justify-between gap-4 text-[0.8125rem]"
                >
                  <span className="text-ink">{addOn.name}</span>
                  <span className="shrink-0 font-mono tabular-nums text-ink-secondary">
                    + {formatMoney(addOn.price)} each
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="w-full shrink-0 text-left sm:w-auto sm:text-right">
        <p className="text-[1rem] font-medium tabular-nums text-ink">{formatMoney(line.lineTotal)}</p>
        <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
          {formatMoney(line.unitPrice)} each
        </p>
        {returnHref && (
          <Link
            href={returnHref}
            className="mt-3 inline-flex text-[0.8125rem] font-medium text-ink hover:text-accent"
          >
            Return this item
          </Link>
        )}
      </div>
    </li>
  );
}

function CardLabel({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">{children}</p>;
}

function DeliveryCard({ order }: { order: OrderDetail }) {
  const { address, contact } = order;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <CardLabel>Delivering to</CardLabel>
      <address className="mt-3 text-[0.9375rem] leading-relaxed not-italic text-ink">
        <p className="font-medium">
          {contact.firstName} {contact.lastName}
        </p>
        <p className="text-ink-secondary">
          {address.address1}
          {address.address2 ? `, ${address.address2}` : ""}
        </p>
        <p className="text-ink-secondary">
          {address.city}, {emirateLabel(address.emirate)}
          {address.postalCode ? ` · ${address.postalCode}` : ""}
        </p>
        <p className="mt-2 text-ink-secondary">{contact.phone}</p>
      </address>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
        <span>{DELIVERY_METHOD_LABELS[order.deliveryMethod]}</span>
        <span>{orderEtaLabel(order)}</span>
      </div>
      {order.trackingNumber && (
        <p className="mt-3 text-[0.875rem] text-ink-secondary">
          Tracking number <span className="font-mono text-ink">{order.trackingNumber}</span>
        </p>
      )}
    </section>
  );
}

function PaymentCard({ order }: { order: OrderDetail }) {
  const showNotice =
    order.paymentStatus === "UNPAID" && order.status !== "CANCELLED" && awaitsPaymentLink(order.paymentMethod);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <CardLabel>Payment</CardLabel>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-[0.9375rem]">
        <p className="text-ink">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
        <p className="text-ink-secondary">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
      </div>
      {showNotice && <p className="mt-3 text-[0.875rem] text-ink-secondary">{PAYMENT_LINK_NOTICE}</p>}
    </section>
  );
}

function TotalsCard({ order }: { order: OrderDetail }) {
  const { totals } = order;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <CardLabel>Order total</CardLabel>
      <dl className="mt-4 space-y-3 text-[0.9375rem]">
        <TotalRow label="Subtotal" value={formatMoney(totals.subtotal)} />
        {totals.discount > 0 && (
          <TotalRow
            label={order.couponCode ? `Discount (${order.couponCode})` : "Discount"}
            value={`− ${formatMoney(totals.discount)}`}
            accent
          />
        )}
        <TotalRow label="Delivery" value={totals.delivery === 0 ? "Free" : formatMoney(totals.delivery)} />
        {totals.refunded > 0 && <TotalRow label="Refunded" value={`− ${formatMoney(totals.refunded)}`} />}
      </dl>
      <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-muted">Total</p>
        <p className="text-[1.25rem] font-medium tabular-nums text-ink">{formatMoney(totals.total)}</p>
      </div>
      <p className="mt-2 text-right text-[0.75rem] text-ink-muted">
        Includes {formatMoney(totals.vatIncluded)} VAT at {totals.vatRatePercent}%
      </p>
    </section>
  );
}

function TotalRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className={cn("tabular-nums", accent ? "text-accent" : "text-ink")}>{value}</dd>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div aria-hidden className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:gap-10">
      <div className="flex flex-col gap-8">
        <div className="skeleton h-44 rounded-2xl" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
      <div className="flex flex-col gap-8">
        <div className="skeleton h-52 rounded-2xl" />
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-60 rounded-2xl" />
      </div>
    </div>
  );
}
