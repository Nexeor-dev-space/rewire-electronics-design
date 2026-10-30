"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { DetailRow, Section } from "@/components/admin/shared/detail-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { useChangeClaimStatus, useGetClaim } from "@/hooks/use-warranty";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ORDER_NOTE_MAX_LENGTH } from "@/lib/constants";
import { formatOrderDate, formatOrderStamp } from "@/lib/dates";
import {
  WARRANTY_CLAIM_STATUS_LABELS,
  claimActionLabel,
  unitLabel,
  type WarrantyClaimStatus,
} from "@/lib/warranty";
import type { AdminWarrantyClaimDetail } from "@/types/warranty";
import { DetailError, DetailSkeleton } from "./warranty-detail";
import { ClaimStatusPill, WarrantyStatusPill, warrantyHref } from "./warranty-management";

export function ClaimDetail({ number }: { number: string }) {
  const access = useModuleAccess(PERMISSIONS.warranty);
  const detail = useGetClaim(number);

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
        <DetailError message={detail.error.message} onRetry={() => detail.refetch()} />
      </AdminPage>
    );
  }

  const data = detail.data;

  return (
    <AdminPage
      title={data.number}
      description={`Warranty claim for ${data.device.productName}, raised ${formatOrderDate(data.raisedAt)}.`}
      actions={<ClaimStatusPill status={data.status} />}
    >
      <div className="mb-6">
        <Link
          href={warrantyHref(data.device.id)}
          className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
        >
          Back to the device
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Section title="Fault">
            <p className="whitespace-pre-line text-sm text-ink-secondary">{data.issue}</p>
          </Section>
          <EventsSection detail={data} />
        </div>

        <div className="flex flex-col gap-6">
          {access.edit && data.nextStatuses.length > 0 && (
            <StatusSection number={data.number} nextStatuses={data.nextStatuses} />
          )}
          <DeviceSection detail={data} />
        </div>
      </div>
    </AdminPage>
  );
}

function DeviceSection({ detail }: { detail: AdminWarrantyClaimDetail }) {
  const { device } = detail;

  return (
    <Section title="Device">
      <dl className="divide-y divide-line">
        <DetailRow label="Product">{device.productName}</DetailRow>
        {device.variantLabel && <DetailRow label="Variant">{device.variantLabel}</DetailRow>}
        <DetailRow label="Serial / IMEI">
          <span className="break-all font-mono">{detail.serialNumber}</span>
        </DetailRow>
        {device.quantity > 1 && (
          <DetailRow label="On the order">{unitLabel(device.unitNumber, device.quantity)}</DetailRow>
        )}
        <DetailRow label="Warranty">
          <WarrantyStatusPill status={device.warrantyStatus} />
        </DetailRow>
        {device.warrantyEndsAt && <DetailRow label="Expires">{formatOrderDate(device.warrantyEndsAt)}</DetailRow>}
        <DetailRow label="Order">
          <span className="font-mono">{detail.orderNumber}</span>
        </DetailRow>
        <DetailRow label="Customer">{detail.customerName || detail.email}</DetailRow>
      </dl>
    </Section>
  );
}

function EventsSection({ detail }: { detail: AdminWarrantyClaimDetail }) {
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
                  <p className="text-sm font-medium text-ink">{WARRANTY_CLAIM_STATUS_LABELS[event.status]}</p>
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                    {formatOrderStamp(event.at)}
                  </p>
                </div>
                {event.actorName && <p className="mt-0.5 text-xs text-ink-muted">By {event.actorName}</p>}
                {event.note && <p className="mt-1.5 whitespace-pre-line text-sm text-ink-secondary">{event.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function StatusSection({ number, nextStatuses }: { number: string; nextStatuses: WarrantyClaimStatus[] }) {
  const id = useId();
  const [note, setNote] = useState("");
  const change = useChangeClaimStatus();
  const noteError = change.isError ? apiFieldErrors(change.error).note?.[0] : undefined;

  function move(status: WarrantyClaimStatus) {
    if (status === "RAISED") return;
    change.mutate({ number, status, note }, { onSuccess: () => setNote("") });
  }

  return (
    <Section title="Update status">
      <Field id={`${id}-note`} label="Note" hint="For staff. Saved in the claim history." error={noteError}>
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
            {claimActionLabel(status)}
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
