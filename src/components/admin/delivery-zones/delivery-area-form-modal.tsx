"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { useCreateDeliveryArea, useUpdateDeliveryArea } from "@/hooks/use-delivery-zone";
import { apiFieldErrors } from "@/lib/api/api-client";
import { EMIRATES, type Emirate } from "@/lib/emirates";
import { fromMinorUnits, toMinorUnits } from "@/lib/money";
import type { AdminDeliveryArea, DeliveryAreaInput } from "@/types/delivery";

type RateField =
  | "standardFee"
  | "expressFee"
  | "standardMinDays"
  | "standardMaxDays"
  | "expressMinDays"
  | "expressMaxDays";

const FEE_FIELDS: { key: RateField; label: string }[] = [
  { key: "standardFee", label: "Standard fee (AED)" },
  { key: "expressFee", label: "Express fee (AED)" },
];

const DAY_FIELDS: { key: RateField; label: string }[] = [
  { key: "standardMinDays", label: "Standard: earliest day" },
  { key: "standardMaxDays", label: "Standard: latest day" },
  { key: "expressMinDays", label: "Express: earliest day" },
  { key: "expressMaxDays", label: "Express: latest day" },
];

const INHERIT_PLACEHOLDER = "Emirate rate";

function initialRates(area: AdminDeliveryArea | undefined): Record<RateField, string> {
  const days = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
  return {
    standardFee: fromMinorUnits(area?.standardFee ?? null),
    expressFee: fromMinorUnits(area?.expressFee ?? null),
    standardMinDays: days(area?.standardMinDays),
    standardMaxDays: days(area?.standardMaxDays),
    expressMinDays: days(area?.expressMinDays),
    expressMaxDays: days(area?.expressMaxDays),
  };
}

/** Empty means inherit (null); anything else must parse, or the field gets an error. */
function parseRates(rates: Record<RateField, string>) {
  const values = {} as Record<RateField, number | null>;
  const errors: Record<string, string[]> = {};

  for (const { key } of FEE_FIELDS) {
    const raw = rates[key].trim();
    const minor = raw ? toMinorUnits(raw) : null;
    if (raw && minor === null) errors[key] = ["Enter an amount like 35.00, or leave it empty."];
    values[key] = minor;
  }
  for (const { key } of DAY_FIELDS) {
    const raw = rates[key].trim();
    const days = raw ? Number(raw) : null;
    if (days !== null && !Number.isInteger(days)) errors[key] = ["Enter a whole number of days, or leave it empty."];
    values[key] = days;
  }
  return { values, errors };
}

export function DeliveryAreaFormModal({
  area,
  defaultEmirate,
  onClose,
  onSaved,
}: {
  area?: AdminDeliveryArea;
  defaultEmirate?: Emirate;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const id = useId();
  const [emirate, setEmirate] = useState<Emirate>(area?.emirate ?? defaultEmirate ?? EMIRATES[0].value);
  const [areaText, setAreaText] = useState(area?.area ?? "");
  const [enabled, setEnabled] = useState(area?.enabled ?? true);
  const [rates, setRates] = useState(() => initialRates(area));
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const createArea = useCreateDeliveryArea();
  const updateArea = useUpdateDeliveryArea();
  const mutation = area ? updateArea : createArea;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseRates(rates);
    const localErrors: Record<string, string[]> = { ...parsed.errors };
    if (!areaText.trim()) localErrors.area = ["Enter the area."];
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    const input: DeliveryAreaInput = { emirate, area: areaText, enabled, ...parsed.values };
    const options = {
      onSuccess: (saved: AdminDeliveryArea) => {
        onSaved(`${saved.area}, ${saved.emirateLabel} ${area ? "saved" : "added"}.`);
        onClose();
      },
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (area) updateArea.mutate({ id: area.id, ...input }, options);
    else createArea.mutate(input, options);
  }

  const error = (field: string) => errors[field]?.[0];

  function rateInput(key: RateField, label: string, inputMode: "decimal" | "numeric") {
    return (
      <Field key={key} id={`${id}-${key}`} label={label} error={error(key)}>
        <Input
          id={`${id}-${key}`}
          inputMode={inputMode}
          placeholder={INHERIT_PLACEHOLDER}
          value={rates[key]}
          onChange={(event) => setRates((current) => ({ ...current, [key]: event.target.value }))}
          aria-invalid={error(key) ? true : undefined}
          className="h-11"
        />
      </Field>
    );
  }

  return (
    <Dialog open onClose={onClose} title={area ? `Edit ${area.area}` : "Add area"}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <DialogBody>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-area`} label="Area" error={error("area")}>
              <Input
                id={`${id}-area`}
                data-autofocus
                value={areaText}
                onChange={(event) => setAreaText(event.target.value)}
                aria-invalid={error("area") ? true : undefined}
                className="h-11"
              />
            </Field>
            <Field id={`${id}-emirate`} label="Emirate" error={error("emirate")}>
              <Select
                id={`${id}-emirate`}
                value={emirate}
                onChange={(event) => setEmirate(event.target.value as Emirate)}
                className="h-11"
              >
                {EMIRATES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            {FEE_FIELDS.map(({ key, label }) => rateInput(key, label, "decimal"))}
            {DAY_FIELDS.map(({ key, label }) => rateInput(key, label, "numeric"))}
          </div>

          <label className="mt-5 inline-flex items-center gap-2 text-sm text-ink-secondary">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            Deliver to this area
          </label>
          <p className="mt-1 text-xs text-ink-muted">
            Leave a fee or both days of a method empty to use the emirate&apos;s rate. Saved orders keep the rate
            they were placed with.
          </p>
        </DialogBody>

        <DialogFooter>
          {mutation.isError && (
            <p role="alert" className="mr-auto text-sm text-danger">
              {mutation.error.message}
            </p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={mutation.isPending}>
            {area ? "Save changes" : "Add area"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
