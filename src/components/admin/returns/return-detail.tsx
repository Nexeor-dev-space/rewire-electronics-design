"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useChangeReturnStatus, useGetAdminReturn } from "@/hooks/use-return";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_RETURNS_PATH, ORDER_NOTE_MAX_LENGTH } from "@/lib/constants";
import { formatOrderDate, formatOrderStamp } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders";
import { RETURN_REASON_META, RETURN_STATUS_LABELS, type ReturnStatus } from "@/lib/returns";
import type { AdminReturnDetail } from "@/types/return";
import { ReturnStatusPill } from "./return-management";
import { RecordRefundDialog } from "./record-refund-dialog";

const CUSTOMER_ACTOR = "Customer";

export function ReturnDetail({ number }: { number: string }) {
  const access = useModuleAccess(PERMISSIONS.returns);
  const detail = useGetAdminReturn(number);
  const [refunding, setRefunding] = useState(false);

  if (detail.isPending) {
    return (
      <AdminPage title={number}>
        <DetailSkeleton />
      </AdminPage>
    );
  }

  if (detail.isError) {
    return (
      <AdminPage title={number}>
        <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
          <p className="text-sm text-ink-secondary">{detail.error.message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => detail.refetch()}>
              Try again
            </Button>
            <BackLink />
          </div>
        </div>
      </AdminPage>
    );
  }

  const data = detail.data;
  const canRecordRefund = access.edit && data.canRefund;

  return (
    <AdminPage
      title={data.number}
      description={`Order ${data.order.number}, requested ${formatOrderDate(data.requestedAt)}.`}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <ReturnStatusPill status={data.status} />
          {canRecordRefund && (
            <Button size="sm" onClick={() => setRefunding(true)}>
              Record refund
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-6">
        <BackLink />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <ItemsSection detail={data} />
          <ReasonSection detail={data} />
          <EventsSection detail={data} />
        </div>

        <div className="flex flex-col gap-6">
          {access.edit && data.nextStatuses.length > 0 && (
            <StatusSection number={data.number} nextStatuses={data.nextStatuses} />
          )}
          <PaymentSection detail={data} />
          <CustomerSection detail={data} />
        </div>
      </div>

      {refunding && <RecordRefundDialog detail={data} onClose={() => setRefunding(false)} />}
    </AdminPage>
  );
}

function BackLink() {
  return (
    <Link
      href={ADMIN_RETURNS_PATH}
      className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
    >
      All returns
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 md:p-6">
      <h2 className="mb-4 text-base font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className="text-sm tabular-nums text-ink">{children}</dd>
    </div>
  );
}

function ItemsSection({ detail }: { detail: AdminReturnDetail }) {
  const count = detail.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Section title={`${count} item${count === 1 ? "" : "s"} returned`}>
      <ul className="divide-y divide-line">
        {detail.items.map((item) => (
          <li key={item.orderItemId} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-plate">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="64px" className="object-contain p-1.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{item.productName}</p>
              {item.variantLabel && <p className="mt-0.5 text-xs text-ink-secondary">{item.variantLabel}</p>}
              <p className="mt-2 font-mono text-xs tabular-nums text-ink-muted">
                {item.quantity} × {formatMoney(item.unitPrice)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ReasonSection({ detail }: { detail: AdminReturnDetail }) {
  return (
    <Section title="Reason">
      <p className="text-sm font-medium text-ink">{RETURN_REASON_META[detail.reason].label}</p>
      {detail.detail ? (
        <p className="mt-2 whitespace-pre-line text-sm text-ink-secondary">{detail.detail}</p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">No detail given.</p>
      )}
    </Section>
  );
}

function EventsSection({ detail }: { detail: AdminReturnDetail }) {
  return (
    <Section title="History">
      {detail.events.length === 0 ? (
        <p className="text-sm text-ink-muted">No history yet.</p>
      ) : (
        <ol className="space-y-4">
          {detail.events.map((event, index) => (
            <li key={`${event.status}-${event.at}-${index}`} className="flex items-start gap-4">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-muted" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{RETURN_STATUS_LABELS[event.status]}</p>
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                    {formatOrderStamp(event.at)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">By {event.actorName ?? CUSTOMER_ACTOR}</p>
                {event.note && (
                  <p className="mt-1.5 whitespace-pre-line text-sm text-ink-secondary">{event.note}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function PaymentSection({ detail }: { detail: AdminReturnDetail }) {
  const { order } = detail;

  return (
    <Section title="Order payment">
      <dl className="divide-y divide-line">
        <DetailRow label="Order">
          <span className="font-mono">{order.number}</span>
        </DetailRow>
        <DetailRow label="Method">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</DetailRow>
        <DetailRow label="Payment status">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</DetailRow>
        <DetailRow label="Order total">{formatMoney(order.total)}</DetailRow>
        <DetailRow label="Refunded so far">{formatMoney(order.refundedAmount)}</DetailRow>
        <DetailRow label="Still refundable">{formatMoney(order.refundable)}</DetailRow>
        {detail.refundAmount !== null && (
          <>
            <DetailRow label="Refund on this return">{formatMoney(detail.refundAmount)}</DetailRow>
            {detail.refundReference && (
              <DetailRow label="Reference">
                <span className="font-mono">{detail.refundReference}</span>
              </DetailRow>
            )}
            {detail.refundedAt && <DetailRow label="Refunded">{formatOrderStamp(detail.refundedAt)}</DetailRow>}
          </>
        )}
      </dl>
      {detail.canRefund && order.refundable === 0 && (
        <p className="mt-3 text-sm text-warn">This order has no payment to refund. Mark it paid first.</p>
      )}
    </Section>
  );
}

function CustomerSection({ detail }: { detail: AdminReturnDetail }) {
  return (
    <Section title="Customer">
      {detail.customer ? (
        <>
          <p className="text-sm font-medium text-ink">{detail.customer.fullName}</p>
          <p className="mt-0.5 break-all text-sm text-ink-secondary">{detail.customer.email}</p>
        </>
      ) : (
        <p className="text-sm text-ink-muted">No account is linked to this order.</p>
      )}
    </Section>
  );
}

function StatusSection({ number, nextStatuses }: { number: string; nextStatuses: ReturnStatus[] }) {
  const id = useId();
  const [note, setNote] = useState("");
  const change = useChangeReturnStatus();
  const noteError = change.isError ? apiFieldErrors(change.error).note?.[0] : undefined;

  function move(status: ReturnStatus) {
    if (status === "REFUNDED") return;
    change.mutate({ number, status, note }, { onSuccess: () => setNote("") });
  }

  return (
    <Section title="Update status">
      <Field id={`${id}-note`} label="Note" hint="Visible to the customer." error={noteError}>
        <Textarea
          id={`${id}-note`}
          value={note}
          maxLength={ORDER_NOTE_MAX_LENGTH}
          onChange={(event) => setNote(event.target.value)}
          aria-invalid={noteError ? true : undefined}
          className="min-h-24"
        />
      </Field>

      <div className="mt-4 flex flex-wrap gap-2">
        {nextStatuses.map((status) => (
          <Button
            key={status}
            variant="outline"
            size="sm"
            disabled={change.isPending}
            loading={change.isPending && change.variables?.status === status}
            onClick={() => move(status)}
          >
            {`Mark ${RETURN_STATUS_LABELS[status].toLowerCase()}`}
          </Button>
        ))}
      </div>

      {change.isError && !noteError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {change.error.message}
        </p>
      )}
    </Section>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-xl border border-line bg-surface p-5 md:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-16 w-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-xl border border-line bg-surface p-5 md:p-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
