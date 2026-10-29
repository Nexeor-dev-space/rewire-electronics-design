"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { DetailRow, Section } from "@/components/admin/shared/detail-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetWarranty } from "@/hooks/use-warranty";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_WARRANTY_PATH } from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { POLICY_ROUTES } from "@/lib/policy-types";
import type { AdminWarrantyDetail } from "@/types/warranty";
import { RaiseClaimDialog } from "./raise-claim-dialog";
import {
  ClaimInProgressPill,
  ClaimStatusPill,
  WarrantyStatusPill,
  claimHref,
  warrantyEditHref,
} from "./warranty-management";

const NOT_YET = "Not yet";

export function WarrantyDetail({ id }: { id: string }) {
  const access = useModuleAccess(PERMISSIONS.warranty);
  const detail = useGetWarranty(id);
  const [raising, setRaising] = useState(false);

  if (detail.isPending) {
    return (
      <AdminPage title="Warranty">
        <DetailSkeleton />
      </AdminPage>
    );
  }

  if (detail.isError) {
    return (
      <AdminPage title="Warranty">
        <DetailError message={detail.error.message} onRetry={() => detail.refetch()} />
      </AdminPage>
    );
  }

  const data = detail.data;

  return (
    <AdminPage
      title={data.productName}
      description={`Order ${data.order.number}${data.serialNumber ? `, serial ${data.serialNumber}` : ""}.`}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <WarrantyStatusPill status={data.status} />
          {data.claimInProgress && <ClaimInProgressPill />}
          {access.edit && (
            <Link href={warrantyEditHref(data.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Edit
            </Link>
          )}
          {access.edit && data.canRaiseClaim && (
            <Button size="sm" onClick={() => setRaising(true)}>
              Raise claim
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-6">
        <WarrantyBackLink />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <DeviceSection detail={data} />
          <CoverSection detail={data} />
          <ClaimsSection detail={data} canEdit={access.edit} />
        </div>
        <div className="flex flex-col gap-6">
          <OrderSection detail={data} />
          <CustomerSection detail={data} />
        </div>
      </div>

      {raising && <RaiseClaimDialog detail={data} onClose={() => setRaising(false)} />}
    </AdminPage>
  );
}

export function WarrantyBackLink() {
  return (
    <Link
      href={ADMIN_WARRANTY_PATH}
      className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
    >
      All warranties
    </Link>
  );
}

export function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
      <p className="text-sm text-ink-secondary">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
        <WarrantyBackLink />
      </div>
    </div>
  );
}

function DateValue({ iso }: { iso: string | null }): ReactNode {
  return iso ? formatOrderDate(iso) : <span className="text-ink-muted">{NOT_YET}</span>;
}

function DeviceSection({ detail }: { detail: AdminWarrantyDetail }) {
  return (
    <Section title="Device">
      <div className="flex items-start gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-plate">
          {detail.imageUrl && (
            <Image src={detail.imageUrl} alt={detail.imageAlt} fill sizes="64px" className="object-contain p-1.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{detail.productName}</p>
          {detail.variantLabel && <p className="mt-0.5 text-xs text-ink-secondary">{detail.variantLabel}</p>}
          <p className="mt-0.5 text-xs text-ink-muted">{detail.brand}</p>
        </div>
      </div>
      <dl className="mt-4 divide-y divide-line">
        <DetailRow label={detail.serials.length > 1 ? "Serials / IMEIs" : "Serial / IMEI"}>
          {detail.serials.length > 0 ? (
            <span className="break-all font-mono">{detail.serials.join(", ")}</span>
          ) : (
            <span className="text-ink-muted">Not recorded</span>
          )}
        </DetailRow>
        <DetailRow label="SKU">
          <span className="font-mono">{detail.sku}</span>
        </DetailRow>
        <DetailRow label="Quantity">{detail.quantity}</DetailRow>
      </dl>
    </Section>
  );
}

function CoverSection({ detail }: { detail: AdminWarrantyDetail }) {
  return (
    <Section title="Warranty">
      <dl className="divide-y divide-line">
        <DetailRow label="Status">
          <WarrantyStatusPill status={detail.status} />
        </DetailRow>
        <DetailRow label="Starts">
          <DateValue iso={detail.warrantyStartsAt} />
        </DetailRow>
        <DetailRow label="Expires">
          <DateValue iso={detail.warrantyEndsAt} />
        </DetailRow>
        <DetailRow label="Standard cover">{detail.baseMonths} months</DetailRow>
        {detail.coverAddOns.map((addOn, index) => (
          <DetailRow key={`${addOn.name}-${index}`} label={addOn.name}>
            +{addOn.extraWarrantyMonths} months
          </DetailRow>
        ))}
        <DetailRow label="Total cover">{detail.totalMonths} months</DetailRow>
      </dl>
      <p className="mt-3 text-sm text-ink-secondary">
        Cover starts on the delivery date. What it includes is set out in the{" "}
        <Link
          href={POLICY_ROUTES.warranty}
          target="_blank"
          className="text-ink underline underline-offset-4 hover:text-accent"
        >
          warranty policy
        </Link>
        .
      </p>
    </Section>
  );
}

function claimHint(detail: AdminWarrantyDetail): string | null {
  if (detail.canRaiseClaim) return null;
  if (detail.status !== "ACTIVE") return "A claim can be raised only while the warranty is active.";
  if (detail.serials.length === 0) return "Record the device's serial or IMEI before raising a claim.";
  return "Every unit on this line already has an open claim.";
}

function ClaimsSection({ detail, canEdit }: { detail: AdminWarrantyDetail; canEdit: boolean }) {
  const hint = canEdit ? claimHint(detail) : null;

  return (
    <Section title="Claims">
      {detail.claims.length === 0 ? (
        <p className="text-sm text-ink-muted">No claims raised for this device.</p>
      ) : (
        <ul className="divide-y divide-line">
          {detail.claims.map((claim) => (
            <li key={claim.number}>
              <Link
                href={claimHref(claim.number)}
                className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors duration-(--duration-fast) hover:text-accent"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink">{claim.number}</p>
                  <p className="mt-0.5 break-all text-xs text-ink-muted">
                    {claim.serialNumber}, raised {formatOrderDate(claim.raisedAt)}
                  </p>
                </div>
                <ClaimStatusPill status={claim.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hint && <p className="mt-3 text-sm text-ink-secondary">{hint}</p>}
    </Section>
  );
}

function OrderSection({ detail }: { detail: AdminWarrantyDetail }) {
  const { order } = detail;

  return (
    <Section title="Order">
      <dl className="divide-y divide-line">
        <DetailRow label="Order">
          <span className="font-mono">{order.number}</span>
        </DetailRow>
        <DetailRow label="Order status">{ORDER_STATUS_LABELS[order.status]}</DetailRow>
        <DetailRow label="Placed">
          <DateValue iso={order.placedAt} />
        </DetailRow>
        <DetailRow label="Dispatched">
          <DateValue iso={order.dispatchedAt} />
        </DetailRow>
        <DetailRow label="Delivered">
          <DateValue iso={order.deliveredAt} />
        </DetailRow>
      </dl>
    </Section>
  );
}

function CustomerSection({ detail }: { detail: AdminWarrantyDetail }) {
  const { contact, customer } = detail;

  return (
    <Section title="Customer">
      <p className="text-sm font-medium text-ink">{contact.name}</p>
      <p className="mt-0.5 break-all text-sm text-ink-secondary">{contact.email}</p>
      <p className="mt-0.5 text-sm text-ink-secondary">{contact.phone}</p>
      {!customer && <p className="mt-3 text-sm text-ink-muted">No account is linked to this order.</p>}
    </Section>
  );
}

export function DetailSkeleton() {
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
