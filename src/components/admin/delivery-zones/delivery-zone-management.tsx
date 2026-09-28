"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDeliveryZones, useUpdateDeliveryZone } from "@/hooks/use-delivery-zone";
import { apiFieldErrors } from "@/lib/api/api-client";
import { DELIVERY_METHOD_LABELS, formatEta } from "@/lib/delivery";
import type { Emirate } from "@/lib/emirates";
import { formatMoney, fromMinorUnits, toMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DeliveryZoneRow } from "@/types/delivery";

const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_6rem_5rem]";

export function DeliveryZoneManagement() {
  const zones = useGetDeliveryZones();
  const [editing, setEditing] = useState<DeliveryZoneRow | null>(null);

  let content: ReactNode;
  if (zones.isPending) {
    content = <TableSkeleton />;
  } else if (zones.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{zones.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => zones.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    content = (
      <div className="overflow-hidden rounded-xl border border-line">
        <TableHeader />
        <ul>
          {zones.data.map((zone) => (
            <li key={zone.emirate} className="border-b border-line last:border-b-0">
              <ZoneRow zone={zone} onEdit={() => setEditing(zone)} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <AdminPage
      title="Delivery Zones"
      description="Delivery zones, their rates and the areas they cover."
    >
      {content}

      {editing && <DeliveryZoneEditDialog zone={editing} onClose={() => setEditing(null)} />}
    </AdminPage>
  );
}

function ZoneRow({ zone, onEdit }: { zone: DeliveryZoneRow; onEdit: () => void }) {
  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS)}>
      <p className="text-sm font-medium text-ink">{zone.label}</p>
      {zone.configured ? (
        <>
          <MethodSummary
            label={DELIVERY_METHOD_LABELS.STANDARD}
            fee={zone.standardFee}
            minDays={zone.standardMinDays}
            maxDays={zone.standardMaxDays}
          />
          <MethodSummary
            label={DELIVERY_METHOD_LABELS.EXPRESS}
            fee={zone.expressFee}
            minDays={zone.expressMinDays}
            maxDays={zone.expressMaxDays}
          />
        </>
      ) : (
        <p className="text-sm text-ink-muted lg:col-span-2">Not configured</p>
      )}
      <div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em]",
            zone.configured ? "bg-live/10 text-live" : "bg-surface-2 text-ink-muted",
          )}
        >
          {zone.configured ? "Configured" : "Not set"}
        </span>
      </div>
      <div className="lg:justify-self-end">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function MethodSummary({
  label,
  fee,
  minDays,
  maxDays,
}: {
  label: string;
  fee: number | null;
  minDays: number | null;
  maxDays: number | null;
}) {
  if (fee === null || minDays === null || maxDays === null) return <p className="text-sm text-ink-muted">—</p>;
  return (
    <p className="text-sm text-ink-secondary">
      <span className="text-ink-muted">{label}:</span> {fee === 0 ? "Free" : formatMoney(fee)}
      {" · "}
      {formatEta(minDays, maxDays)}
    </p>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Emirate</p>
      <p className="eyebrow">Standard</p>
      <p className="eyebrow">Express</p>
      <p className="eyebrow">Status</p>
      <span className="sr-only">Actions</span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      <TableHeader />
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className={cn("grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-9 w-16" />
        </div>
      ))}
    </div>
  );
}

function DeliveryZoneEditDialog({ zone, onClose }: { zone: DeliveryZoneRow; onClose: () => void }) {
  const id = useId();
  const [standardFee, setStandardFee] = useState(fromMinorUnits(zone.standardFee));
  const [standardMinDays, setStandardMinDays] = useState(zone.standardMinDays?.toString() ?? "");
  const [standardMaxDays, setStandardMaxDays] = useState(zone.standardMaxDays?.toString() ?? "");
  const [expressFee, setExpressFee] = useState(fromMinorUnits(zone.expressFee));
  const [expressMinDays, setExpressMinDays] = useState(zone.expressMinDays?.toString() ?? "");
  const [expressMaxDays, setExpressMaxDays] = useState(zone.expressMaxDays?.toString() ?? "");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const updateZone = useUpdateDeliveryZone();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const standardFeeMinor = toMinorUnits(standardFee || "0");
    const expressFeeMinor = toMinorUnits(expressFee || "0");
    const standardMinDaysNum = Number.parseInt(standardMinDays, 10);
    const standardMaxDaysNum = Number.parseInt(standardMaxDays, 10);
    const expressMinDaysNum = Number.parseInt(expressMinDays, 10);
    const expressMaxDaysNum = Number.parseInt(expressMaxDays, 10);

    const localErrors: Record<string, string[] | undefined> = {};
    if (standardFeeMinor === null) localErrors.standardFee = ["Enter an amount like 0.00."];
    if (expressFeeMinor === null) localErrors.expressFee = ["Enter an amount like 35.00."];
    if (!Number.isInteger(standardMinDaysNum)) localErrors.standardMinDays = ["Enter a whole number of days."];
    if (!Number.isInteger(standardMaxDaysNum)) localErrors.standardMaxDays = ["Enter a whole number of days."];
    if (!Number.isInteger(expressMinDaysNum)) localErrors.expressMinDays = ["Enter a whole number of days."];
    if (!Number.isInteger(expressMaxDaysNum)) localErrors.expressMaxDays = ["Enter a whole number of days."];
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    updateZone.mutate(
      {
        emirate: zone.emirate as Emirate,
        standardFee: standardFeeMinor as number,
        expressFee: expressFeeMinor as number,
        standardMinDays: standardMinDaysNum,
        standardMaxDays: standardMaxDaysNum,
        expressMinDays: expressMinDaysNum,
        expressMaxDays: expressMaxDaysNum,
      },
      {
        onSuccess: () => onClose(),
        onError: (error) => setErrors(apiFieldErrors(error)),
      },
    );
  }

  const error = (field: string) => errors[field]?.[0];
  const previewMinDays = Number.parseInt(standardMinDays, 10);
  const previewMaxDays = Number.parseInt(standardMaxDays, 10);
  const expressPreviewMinDays = Number.parseInt(expressMinDays, 10);
  const expressPreviewMaxDays = Number.parseInt(expressMaxDays, 10);

  return (
    <Dialog open onClose={onClose} title={`Edit ${zone.label}`}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <DialogBody>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-standard-fee`} label="Standard fee (AED)" error={error("standardFee")}>
              <Input
                id={`${id}-standard-fee`}
                data-autofocus
                inputMode="decimal"
                value={standardFee}
                onChange={(event) => setStandardFee(event.target.value)}
                aria-invalid={error("standardFee") ? true : undefined}
                className="h-11"
              />
            </Field>
            <Field id={`${id}-express-fee`} label="Express fee (AED)" error={error("expressFee")}>
              <Input
                id={`${id}-express-fee`}
                inputMode="decimal"
                value={expressFee}
                onChange={(event) => setExpressFee(event.target.value)}
                aria-invalid={error("expressFee") ? true : undefined}
                className="h-11"
              />
            </Field>

            <Field id={`${id}-standard-min`} label="Standard: earliest day" error={error("standardMinDays")}>
              <Input
                id={`${id}-standard-min`}
                inputMode="numeric"
                value={standardMinDays}
                onChange={(event) => setStandardMinDays(event.target.value)}
                className="h-11"
              />
            </Field>
            <Field id={`${id}-standard-max`} label="Standard: latest day" error={error("standardMaxDays")}>
              <Input
                id={`${id}-standard-max`}
                inputMode="numeric"
                value={standardMaxDays}
                onChange={(event) => setStandardMaxDays(event.target.value)}
                className="h-11"
              />
            </Field>

            <Field id={`${id}-express-min`} label="Express: earliest day" error={error("expressMinDays")}>
              <Input
                id={`${id}-express-min`}
                inputMode="numeric"
                value={expressMinDays}
                onChange={(event) => setExpressMinDays(event.target.value)}
                className="h-11"
              />
            </Field>
            <Field id={`${id}-express-max`} label="Express: latest day" error={error("expressMaxDays")}>
              <Input
                id={`${id}-express-max`}
                inputMode="numeric"
                value={expressMaxDays}
                onChange={(event) => setExpressMaxDays(event.target.value)}
                className="h-11"
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-col gap-1 rounded-lg border border-line bg-surface-2 px-4 py-3 text-xs text-ink-muted">
            {Number.isInteger(previewMinDays) && Number.isInteger(previewMaxDays) && (
              <p>Standard: {formatEta(previewMinDays, previewMaxDays)}</p>
            )}
            {Number.isInteger(expressPreviewMinDays) && Number.isInteger(expressPreviewMaxDays) && (
              <p>Express: {formatEta(expressPreviewMinDays, expressPreviewMaxDays)}</p>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          {updateZone.isError && (
            <p role="alert" className="mr-auto text-sm text-danger">
              {updateZone.error.message}
            </p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={updateZone.isPending}>
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
