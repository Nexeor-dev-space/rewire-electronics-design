"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { GuestBadge } from "@/components/admin/shared/guest-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChangeOrderPayment,
  useChangeOrderStatus,
  useGetAdminOrder,
  useUpdateOrder,
} from "@/hooks/use-order";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADD_ON_KIND_LABELS } from "@/lib/catalogue";
import {
  ORDER_NOTE_MAX_LENGTH,
  STAFF_NOTE_MAX_LENGTH,
  TRACKING_NUMBER_MAX_LENGTH,
} from "@/lib/constants";
import { DELIVERY_METHOD_LABELS, formatEta } from "@/lib/delivery";
import { emirateLabel } from "@/lib/emirates";
import { formatMoney } from "@/lib/money";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type ManualPaymentStatus,
  type OrderStatus,
} from "@/lib/orders";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import type { AdminOrderDetail, OrderLine } from "@/types/order";
import {
  LoadError,
  ORDERS_ADMIN_PATH,
  OrderStatusBadge,
  PaymentStatusBadge,
  formatOrderDate,
} from "./order-shared";

const PAYMENT_ACTION_LABELS: Record<ManualPaymentStatus, string> = {
  PAID: "Mark as paid",
  UNPAID: "Mark as unpaid",
  REFUNDED: "Mark as refunded",
};

function statusActionLabel(status: OrderStatus): string {
  return status === "CANCELLED" ? "Cancel order" : `Move to ${ORDER_STATUS_LABELS[status]}`;
}

export function OrderDetailScreen({ number }: { number: string }) {
  const order = useGetAdminOrder(number);
  const { edit: canEdit } = useModuleAccess(PERMISSIONS.orders);

  let content: ReactNode;
  if (order.isPending) {
    content = <DetailSkeleton />;
  } else if (order.isError) {
    content = <LoadError message={order.error.message} onRetry={() => order.refetch()} />;
  } else {
    content = <OrderDetailBody order={order.data} canEdit={canEdit} />;
  }

  return (
    <AdminPage
      title={`Order ${order.data?.number ?? number}`}
      description={order.data ? `Placed ${formatOrderDate(order.data.placedAt)}` : undefined}
      actions={
        <Link
          href={ORDERS_ADMIN_PATH}
          className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
        >
          All orders
        </Link>
      }
    >
      {content}
    </AdminPage>
  );
}

function OrderDetailBody({ order, canEdit }: { order: AdminOrderDetail; canEdit: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-6">
        <Panel title="Items">
          <ItemList lines={order.lines} />
          <Totals order={order} />
        </Panel>
        <Panel title="History" hint="Oldest first. Notes are shown to the customer.">
          <EventList order={order} />
        </Panel>
      </div>

      <div className="flex flex-col gap-6">
        <Panel title="Status">
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
          </div>
          {order.status === "PENDING_PAYMENT" && order.paymentStatus !== "PAID" && (
            <p className="mt-3 text-xs text-ink-muted">Marking the payment as paid confirms the order.</p>
          )}
          {canEdit && <StatusActions order={order} />}
        </Panel>

        <Panel title="Payment">
          <dl>
            <Row label="Method">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</Row>
            <Row label="Status">
              <PaymentStatusBadge status={order.paymentStatus} />
            </Row>
            {order.couponCode && (
              <Row label="Discount code">
                <span className="font-mono">{order.couponCode}</span>
              </Row>
            )}
          </dl>
          {canEdit && <PaymentActions order={order} />}
        </Panel>

        <Panel title="Delivery">
          <dl>
            <Row label="Method">{DELIVERY_METHOD_LABELS[order.deliveryMethod]}</Row>
            <Row label="Estimate">{formatEta(order.etaMinDays, order.etaMaxDays)}</Row>
            {order.deliveredAt && <Row label="Delivered">{formatOrderDate(order.deliveredAt)}</Row>}
            {order.returnableUntil && (
              <Row label="Returnable until">{formatOrderDate(order.returnableUntil)}</Row>
            )}
          </dl>
          {canEdit ? (
            <TrackingAndNoteForm key={`${order.trackingNumber}|${order.staffNote}`} order={order} />
          ) : (
            <TrackingAndNoteView order={order} />
          )}
        </Panel>

        <Panel title="Customer">
          <CustomerDetails order={order} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="eyebrow">{title}</h2>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  );
}

function lineOptions(line: OrderLine): string {
  return [
    line.brand,
    CONDITION_META[line.condition].label,
    line.grade && GRADE_META[line.grade].label,
    line.storage,
    line.colour,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ItemList({ lines }: { lines: OrderLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <li key={line.id} className="flex justify-between gap-4 py-4 first:pt-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{line.productName}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{lineOptions(line)}</p>
            <p className="mt-0.5 font-mono text-xs text-ink-muted">{line.sku}</p>
            {line.addOns.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {line.addOns.map((addOn, index) => (
                  <li key={addOn.id ?? `${addOn.name}-${index}`} className="text-xs text-ink-secondary">
                    {addOn.name} · {ADD_ON_KIND_LABELS[addOn.kind]} ·{" "}
                    <span className="tabular-nums">{formatMoney(addOn.price)}</span> each
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm tabular-nums text-ink">{formatMoney(line.lineTotal)}</p>
            <p className="mt-0.5 text-xs tabular-nums text-ink-muted">
              {line.quantity} × {formatMoney(line.unitPrice)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Totals({ order }: { order: AdminOrderDetail }) {
  const { totals } = order;
  return (
    <dl className="mt-2 border-t border-line pt-3 tabular-nums">
      <Row label="Subtotal">{formatMoney(totals.subtotal)}</Row>
      {totals.discount > 0 && (
        <Row label={order.couponCode ? `Discount (${order.couponCode})` : "Discount"}>
          -{formatMoney(totals.discount)}
        </Row>
      )}
      <Row label="Delivery">{formatMoney(totals.delivery)}</Row>
      <div className="mt-1 flex items-center justify-between gap-4 border-t border-line pt-3 text-sm font-medium text-ink">
        <dt>Total</dt>
        <dd>{formatMoney(totals.total)}</dd>
      </div>
      <Row label={`VAT included (${totals.vatRatePercent}%)`}>{formatMoney(totals.vatIncluded)}</Row>
      {totals.refunded > 0 && <Row label="Refunded">-{formatMoney(totals.refunded)}</Row>}
    </dl>
  );
}

function EventList({ order }: { order: AdminOrderDetail }) {
  if (order.events.length === 0) {
    return <p className="text-sm text-ink-muted">No status changes recorded yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {order.events.map((event) => (
        <li key={event.id} className="border-l border-line-strong pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={event.status} />
            <time dateTime={event.at} className="text-xs text-ink-muted">
              {formatOrderDate(event.at)}
            </time>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{event.actorName ?? "Customer or system"}</p>
          {event.note && <p className="mt-1 text-sm text-ink-secondary">{event.note}</p>}
        </li>
      ))}
    </ol>
  );
}

function StatusActions({ order }: { order: AdminOrderDetail }) {
  const id = useId();
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const changeStatus = useChangeOrderStatus();

  if (order.nextStatuses.length === 0) {
    return <p className="mt-3 text-xs text-ink-muted">This order is final. Its status can&apos;t change.</p>;
  }

  function submit(status: OrderStatus) {
    changeStatus.mutate(
      { number: order.number, status, note },
      {
        onSuccess: () => {
          setNote("");
          setConfirming(false);
        },
      },
    );
  }

  function cancelConfirm() {
    setConfirming(false);
    changeStatus.reset();
  }

  return (
    <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
      <Field
        id={`${id}-note`}
        label="Note to the customer"
        hint="Optional. Saved with the change and shown to the customer on their order."
      >
        <Textarea
          id={`${id}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={ORDER_NOTE_MAX_LENGTH}
          className="min-h-24"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        {order.nextStatuses.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === "CANCELLED" ? "outline" : "primary"}
            loading={changeStatus.isPending && changeStatus.variables?.status === status}
            disabled={changeStatus.isPending}
            onClick={() => (status === "CANCELLED" ? setConfirming(true) : submit(status))}
          >
            {statusActionLabel(status)}
          </Button>
        ))}
      </div>
      {!confirming && <FieldError>{changeStatus.error?.message}</FieldError>}

      <ConfirmDialog
        open={confirming}
        title={`Cancel ${order.number}?`}
        description="Its items go back into stock and any discount code use is released. A cancelled order can't be reopened."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        error={changeStatus.error?.message}
        loading={changeStatus.isPending}
        onCancel={cancelConfirm}
        onConfirm={() => submit("CANCELLED")}
      />
    </div>
  );
}

function PaymentActions({ order }: { order: AdminOrderDetail }) {
  const [confirming, setConfirming] = useState(false);
  const changePayment = useChangeOrderPayment();

  if (order.paymentActions.length === 0) return null;

  function submit(paymentStatus: ManualPaymentStatus) {
    changePayment.mutate(
      { number: order.number, paymentStatus },
      { onSuccess: () => setConfirming(false) },
    );
  }

  function cancelConfirm() {
    setConfirming(false);
    changePayment.reset();
  }

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
      <div className="flex flex-wrap gap-2">
        {order.paymentActions.map((paymentStatus) => (
          <Button
            key={paymentStatus}
            size="sm"
            variant="outline"
            loading={changePayment.isPending && changePayment.variables?.paymentStatus === paymentStatus}
            disabled={changePayment.isPending}
            onClick={() => (paymentStatus === "REFUNDED" ? setConfirming(true) : submit(paymentStatus))}
          >
            {PAYMENT_ACTION_LABELS[paymentStatus]}
          </Button>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        This records the payment state only. No money moves from this screen.
      </p>
      {!confirming && <FieldError>{changePayment.error?.message}</FieldError>}

      <ConfirmDialog
        open={confirming}
        title={`Mark ${order.number} as refunded?`}
        description={`Records the full ${formatMoney(order.totals.total)} as refunded. Refund the customer through your payment provider; this screen moves no money.`}
        confirmLabel="Mark as refunded"
        error={changePayment.error?.message}
        loading={changePayment.isPending}
        onCancel={cancelConfirm}
        onConfirm={() => submit("REFUNDED")}
      />
    </div>
  );
}

function TrackingAndNoteForm({ order }: { order: AdminOrderDetail }) {
  const id = useId();
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber);
  const [staffNote, setStaffNote] = useState(order.staffNote);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const updateOrder = useUpdateOrder();

  const trackingChanged = trackingNumber !== order.trackingNumber;
  const noteChanged = staffNote !== order.staffNote;
  const hasFieldErrors = Boolean(errors.trackingNumber || errors.staffNote);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    updateOrder.mutate(
      {
        number: order.number,
        ...(trackingChanged ? { trackingNumber } : {}),
        ...(noteChanged ? { staffNote } : {}),
      },
      { onError: (error) => setErrors(apiFieldErrors(error)) },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
      <Field
        id={`${id}-tracking`}
        label="Tracking number"
        hint="Shown to the customer on their order."
        error={errors.trackingNumber?.[0]}
      >
        <Input
          id={`${id}-tracking`}
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          maxLength={TRACKING_NUMBER_MAX_LENGTH}
          aria-invalid={Boolean(errors.trackingNumber) || undefined}
          className="h-10 font-mono"
        />
      </Field>
      <Field
        id={`${id}-staff-note`}
        label="Staff note"
        hint="For staff only. Never shown to the customer."
        error={errors.staffNote?.[0]}
      >
        <Textarea
          id={`${id}-staff-note`}
          value={staffNote}
          onChange={(event) => setStaffNote(event.target.value)}
          maxLength={STAFF_NOTE_MAX_LENGTH}
          aria-invalid={Boolean(errors.staffNote) || undefined}
          className="min-h-24"
        />
      </Field>
      {updateOrder.isError && !hasFieldErrors && <FieldError>{updateOrder.error.message}</FieldError>}
      <div>
        <Button type="submit" size="sm" loading={updateOrder.isPending} disabled={!trackingChanged && !noteChanged}>
          Save
        </Button>
      </div>
    </form>
  );
}

function TrackingAndNoteView({ order }: { order: AdminOrderDetail }) {
  return (
    <dl className="mt-3 border-t border-line pt-3">
      <Row label="Tracking number">
        <span className="font-mono">{order.trackingNumber || "Not set"}</span>
      </Row>
      <div className="py-1.5 text-sm">
        <dt className="text-ink-secondary">Staff note (never shown to the customer)</dt>
        <dd className="mt-1 whitespace-pre-line text-ink">{order.staffNote || "None"}</dd>
      </div>
    </dl>
  );
}

function CustomerDetails({ order }: { order: AdminOrderDetail }) {
  const { customer, contact, address } = order;
  const guest = order.placedAsGuest || Boolean(customer?.isGuest);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
          {customer ? customer.fullName : "No linked account"}
          {guest && <GuestBadge />}
        </p>
        {customer && <p className="mt-0.5 text-ink-secondary">{customer.email}</p>}
      </div>

      <div className="border-t border-line pt-4">
        <p className="eyebrow">Contact</p>
        <p className="mt-2 text-ink">
          {contact.firstName} {contact.lastName}
        </p>
        <p className="text-ink-secondary">{contact.email}</p>
        <p className="tabular-nums text-ink-secondary">{contact.phone}</p>
      </div>

      <div className="border-t border-line pt-4">
        <p className="eyebrow">Delivery address</p>
        <address className="mt-2 not-italic text-ink-secondary">
          <span className="block text-ink">{address.address1}</span>
          {address.address2 && <span className="block">{address.address2}</span>}
          <span className="block">
            {address.city}
            {address.postalCode && ` ${address.postalCode}`}
          </span>
          <span className="block">{emirateLabel(address.emirate)}</span>
        </address>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  );
}
