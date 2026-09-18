"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { EMIRATES, emirateLabel, type Emirate } from "@/lib/emirates";
import { cn } from "@/lib/utils";
import { addressSchema } from "@/validators/user.validator";

/**
 * Addresses inside the account modal. Edits a local list that is saved
 * with the account. Keeps exactly one primary: marking one unmarks the
 * rest, and when none is marked the first address takes it.
 */

export interface DraftAddress {
  /** Client-side key; `id` is only set for addresses already saved. */
  key: string;
  id?: string;
  emirate: Emirate;
  street: string;
  landmark: string;
  isPrimary: boolean;
}

let keyCount = 0;
export const newKey = () => `address-${++keyCount}`;

function withPrimary(list: DraftAddress[], primaryKey?: string): DraftAddress[] {
  const key = primaryKey ?? list.find((address) => address.isPrimary)?.key ?? list[0]?.key;
  return list.map((address) => ({ ...address, isPrimary: address.key === key }));
}

export function AddressListEditor({
  addresses,
  onChange,
  editing,
  onEditingChange,
  error,
}: {
  addresses: DraftAddress[];
  onChange: (next: DraftAddress[]) => void;
  /** Key of the address being edited, "new" while adding, or null. */
  editing: string | null;
  onEditingChange: (key: string | null) => void;
  error?: string;
}) {
  const radioName = useId();

  function save(values: Omit<DraftAddress, "key" | "id">) {
    const key = editing === "new" ? newKey() : editing!;
    const next =
      editing === "new"
        ? [...addresses, { ...values, key }]
        : addresses.map((address) => (address.key === key ? { ...address, ...values } : address));
    onChange(withPrimary(next, values.isPrimary ? key : undefined));
    onEditingChange(null);
  }

  return (
    <fieldset>
      <legend className="eyebrow">Addresses</legend>

      <ul className="mt-4 flex flex-col gap-3">
        {addresses.map((address) => (
          <li key={address.key}>
            {editing === address.key ? (
              <AddressForm
                initial={address}
                onSave={save}
                onCancel={() => onEditingChange(null)}
              />
            ) : (
              <div className="flex flex-wrap items-start gap-4 rounded-xl border border-line bg-surface p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{emirateLabel(address.emirate)}</p>
                  <p className="mt-0.5 break-words text-sm text-ink-secondary">{address.street}</p>
                  <p className="mt-0.5 break-words text-xs text-ink-muted">Near {address.landmark}</p>
                  <label className="mt-3 inline-flex items-center gap-2 text-xs text-ink-secondary">
                    <input
                      type="radio"
                      name={radioName}
                      checked={address.isPrimary}
                      disabled={editing !== null}
                      onChange={() => onChange(withPrimary(addresses, address.key))}
                    />
                    {address.isPrimary ? "Primary address" : "Set as primary"}
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={editing !== null}
                    onClick={() => onEditingChange(address.key)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={editing !== null}
                    onClick={() =>
                      onChange(withPrimary(addresses.filter((item) => item.key !== address.key)))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}

        {editing === "new" && (
          <li>
            <AddressForm onSave={save} onCancel={() => onEditingChange(null)} />
          </li>
        )}
      </ul>

      {addresses.length === 0 && editing !== "new" && (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-secondary">
          No saved addresses.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {editing === null && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => onEditingChange("new")}
        >
          Add address
        </Button>
      )}
    </fieldset>
  );
}

/** Label, control, hint and error — shared with the account form. */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function AddressForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DraftAddress;
  onSave: (values: Omit<DraftAddress, "key" | "id">) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [emirate, setEmirate] = useState<string>(initial?.emirate ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [landmark, setLandmark] = useState(initial?.landmark ?? "");
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  function submit() {
    const parsed = addressSchema.omit({ id: true }).safeParse({ emirate, street, landmark, isPrimary });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    onSave(parsed.data);
  }

  // Inside the customer <form>: Enter saves this address, not the customer.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div
      role="group"
      aria-label={initial ? "Edit address" : "New address"}
      onKeyDown={handleKeyDown}
      className="rounded-xl border border-line-strong bg-surface-3 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-emirate`} label="Emirate" error={errors.emirate?.[0]}>
          <Select
            id={`${id}-emirate`}
            value={emirate}
            onChange={(event) => setEmirate(event.target.value)}
            aria-invalid={errors.emirate ? true : undefined}
            className="h-11"
          >
            <option value="">Choose an emirate</option>
            {EMIRATES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={`${id}-street`} label="Street name / number" error={errors.street?.[0]}>
          <Input
            id={`${id}-street`}
            value={street}
            onChange={(event) => setStreet(event.target.value)}
            aria-invalid={errors.street ? true : undefined}
            className="h-11"
          />
        </Field>

        <Field
          id={`${id}-landmark`}
          label="Nearest landmark"
          error={errors.landmark?.[0]}
          className="sm:col-span-2"
        >
          <Input
            id={`${id}-landmark`}
            value={landmark}
            onChange={(event) => setLandmark(event.target.value)}
            aria-invalid={errors.landmark ? true : undefined}
            className="h-11"
          />
        </Field>
      </div>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-ink-secondary">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(event) => setIsPrimary(event.target.checked)}
        />
        Set as primary address
      </label>

      <div className="mt-4 flex gap-2">
        <Button type="button" size="sm" onClick={submit}>
          {initial ? "Update address" : "Add address"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
