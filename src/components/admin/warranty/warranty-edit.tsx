"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { AdminPage } from "@/components/admin/admin-page";
import { DetailRow, Section } from "@/components/admin/shared/detail-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useGetWarranty, useUpdateWarranty } from "@/hooks/use-warranty";
import { apiFieldErrors } from "@/lib/api/api-client";
import { SERIAL_NUMBER_MAX_LENGTH } from "@/lib/constants";
import { formatOrderDate, fromStoreDateTimeInput, toStoreDateTimeInput } from "@/lib/dates";
import { warrantyEndsAt } from "@/lib/orders";
import { checkWarrantyStart, unitLabel } from "@/lib/warranty";
import type { AdminWarrantyDetail, UpdateWarrantyInput } from "@/types/warranty";
import { updateWarrantySchema } from "@/validators/warranty.validator";
import { DetailError, DetailSkeleton, WarrantyBackLink } from "./warranty-detail";
import { WarrantyStatusPill, warrantyHref } from "./warranty-management";

const MESSAGE_SAVED = "Warranty saved.";
const MESSAGE_NO_CHANGES = "Nothing has changed.";
const MESSAGE_INVALID_START = "Enter a date and time.";

export function WarrantyEdit({ id }: { id: string }) {
  const detail = useGetWarranty(id);

  if (detail.isPending) {
    return (
      <AdminPage title="Edit warranty">
        <DetailSkeleton />
      </AdminPage>
    );
  }

  if (detail.isError) {
    return (
      <AdminPage title="Edit warranty">
        <DetailError message={detail.error.message} onRetry={() => detail.refetch()} />
      </AdminPage>
    );
  }

  return <WarrantyEditForm detail={detail.data} />;
}

function WarrantyEditForm({ detail }: { detail: AdminWarrantyDetail }) {
  const id = useId();
  const initialSerial = detail.serialNumber ?? "";
  const initialStart = toStoreDateTimeInput(detail.warrantyStartsAt);
  const [serialNumber, setSerialNumber] = useState(initialSerial);
  const [startsAt, setStartsAt] = useState(initialStart);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const update = useUpdateWarranty();

  const started = detail.warrantyStartsAt !== null;
  const startIso = fromStoreDateTimeInput(startsAt);
  const expiresPreview = startIso ? warrantyEndsAt(new Date(startIso), detail.totalMonths).toISOString() : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const changes: UpdateWarrantyInput = {};
    if (serialNumber.trim() !== initialSerial) changes.serialNumber = serialNumber;
    if (started && startsAt !== initialStart) {
      if (!startIso) {
        setErrors({ warrantyStartsAt: [MESSAGE_INVALID_START] });
        return;
      }
      changes.warrantyStartsAt = startIso;
    }
    if (Object.keys(changes).length === 0) {
      setErrors({});
      setNotice(MESSAGE_NO_CHANGES);
      return;
    }

    const parsed = updateWarrantySchema.safeParse(changes);
    const localErrors: Record<string, string[] | undefined> = parsed.success
      ? {}
      : z.flattenError(parsed.error).fieldErrors;
    const startMessage = changes.warrantyStartsAt
      ? checkWarrantyStart(new Date(changes.warrantyStartsAt), new Date(detail.order.placedAt), new Date())
      : null;
    if (startMessage) localErrors.warrantyStartsAt = [startMessage];
    if (!parsed.success || startMessage) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    update.mutate(
      { id: detail.id, ...parsed.data },
      {
        onSuccess: () => setNotice(MESSAGE_SAVED),
        onError: (error) => setErrors(apiFieldErrors(error)),
      },
    );
  }

  const error = (field: string) => errors[field]?.[0];
  const hasFieldError = Object.values(errors).some((messages) => messages?.length);

  return (
    <AdminPage
      title="Edit warranty"
      description={`${detail.productName}, order ${detail.order.number}.`}
      actions={<WarrantyStatusPill status={detail.status} />}
    >
      <div className="mb-6">
        <WarrantyBackLink />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} noValidate>
          <Section title="Warranty details">
            <div className="grid gap-5">
              <Field
                id={`${id}-serial`}
                label="Serial / IMEI"
                hint={`${unitLabel(detail.unitNumber, detail.quantity) || "This device"}. Leave empty if it isn't recorded yet.`}
                error={error("serialNumber")}
              >
                <Input
                  id={`${id}-serial`}
                  value={serialNumber}
                  maxLength={SERIAL_NUMBER_MAX_LENGTH}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  aria-invalid={error("serialNumber") ? true : undefined}
                  className="h-11 font-mono"
                />
              </Field>

              <Field
                id={`${id}-starts`}
                label="Warranty start"
                hint={
                  started
                    ? `The delivery date. Correct it if the device reached the customer on another day.${detail.quantity > 1 ? ` It applies to all ${detail.quantity} units on this order line.` : ""}`
                    : "Starts when the order is marked delivered."
                }
                error={error("warrantyStartsAt")}
              >
                <Input
                  id={`${id}-starts`}
                  type="datetime-local"
                  value={startsAt}
                  disabled={!started}
                  onChange={(event) => setStartsAt(event.target.value)}
                  aria-invalid={error("warrantyStartsAt") ? true : undefined}
                  className="h-11"
                />
              </Field>

              <dl className="divide-y divide-line">
                <DetailRow label="Expires">
                  {expiresPreview ? formatOrderDate(expiresPreview) : <span className="text-ink-muted">Not yet</span>}
                </DetailRow>
                <DetailRow label="Total cover">{detail.totalMonths} months</DetailRow>
              </dl>
              <p className="text-xs text-ink-muted">
                The expiry date and the status follow from the start date and the cover, so they can&apos;t be set by
                hand.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" loading={update.isPending}>
                Save
              </Button>
              <Link href={warrantyHref(detail.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Cancel
              </Link>
              {notice && (
                <p role="status" className="text-sm text-live">
                  {notice}
                </p>
              )}
              {update.isError && !hasFieldError && (
                <p role="alert" className="text-sm text-danger">
                  {update.error.message}
                </p>
              )}
            </div>
          </Section>
        </form>

        <Section title="Linked records">
          <dl className="divide-y divide-line">
            <DetailRow label="Product">{detail.productName}</DetailRow>
            {detail.variantLabel && <DetailRow label="Variant">{detail.variantLabel}</DetailRow>}
            <DetailRow label="Order">
              <span className="font-mono">{detail.order.number}</span>
            </DetailRow>
            <DetailRow label="Customer">{detail.contact.name}</DetailRow>
          </dl>
          <p className="mt-3 text-xs text-ink-muted">
            The device stays linked to this product, order and customer.
          </p>
        </Section>
      </div>
    </AdminPage>
  );
}
