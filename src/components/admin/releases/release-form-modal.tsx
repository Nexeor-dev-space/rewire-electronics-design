"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useCreateRelease } from "@/hooks/use-release";
import { apiFieldErrors } from "@/lib/api/api-client";
import {
  RELEASE_DESCRIPTION_MAX_LENGTH,
  RELEASE_EDITION_MAX_LENGTH,
  RELEASE_MAX_PER_CUSTOMER_DEFAULT,
  RELEASE_MAX_PER_CUSTOMER_LIMIT,
  RELEASE_REMINDERS_MAX,
  RELEASE_TITLE_MAX_LENGTH,
} from "@/lib/constants";
import { formatStoreDateTime, fromStoreDateTimeInput, toStoreDateTimeInput } from "@/lib/dates";
import {
  NEW_REMINDER_ROW,
  REMINDER_UNIT_LABELS,
  REMINDER_UNITS,
  reminderRowMinutes,
  remindersSummary,
  toReminderRow,
  type ReleaseEdits,
  type ReminderRow,
  type ReminderUnit,
} from "@/lib/releases";
import type { AdminReleaseDetail, ReleaseInput } from "@/types/release";
import {
  RELEASE_END_BEFORE_START,
  endsBeforeStart,
  releaseSchema,
  reminderOffsetsValidator,
} from "@/validators/release.validator";
import { releaseAdminHref } from "./release-shared";

export type FieldErrors = Record<string, string[] | undefined>;

export interface ReleaseFormValues {
  title: string;
  edition: string;
  description: string;
  startsAt: string;
  endsAt: string;
  maxPerCustomer: string;
  hidden: boolean;
  reminders?: ReminderRow[];
}

export function releaseFormValues(release?: AdminReleaseDetail): ReleaseFormValues {
  return {
    title: release?.title ?? "",
    edition: release?.edition ?? "",
    description: release?.description ?? "",
    startsAt: toStoreDateTimeInput(release?.startsAt ?? null),
    endsAt: toStoreDateTimeInput(release?.endsAt ?? null),
    maxPerCustomer: String(release?.maxPerCustomer ?? RELEASE_MAX_PER_CUSTOMER_DEFAULT),
    hidden: release?.hidden ?? false,
    ...(release && { reminders: release.reminders.map(toReminderRow) }),
  };
}

export function parseReleaseForm(
  values: ReleaseFormValues,
  overrides: Partial<ReleaseInput> = {},
): { data: ReleaseInput; errors?: undefined } | { data?: undefined; errors: FieldErrors } {
  const parsed = releaseSchema.safeParse({
    title: values.title,
    edition: values.edition,
    description: values.description,
    startsAt: fromStoreDateTimeInput(values.startsAt),
    endsAt: fromStoreDateTimeInput(values.endsAt),
    maxPerCustomer: values.maxPerCustomer === "" ? undefined : Number(values.maxPerCustomer),
    hidden: values.hidden,
    ...(values.reminders !== undefined && { reminders: values.reminders.map(reminderRowMinutes) }),
    ...overrides,
  });

  if (parsed.success) return { data: parsed.data };

  const errors: FieldErrors = z.flattenError(parsed.error).fieldErrors;
  if (!values.startsAt && overrides.startsAt === undefined) errors.startsAt = ["Enter an opening time."];
  return { errors };
}

function saleWindow(startIso: string, endIso: string | null): string {
  const until = endIso ? `until ${formatStoreDateTime(endIso)}` : "with no end set yet";
  return `Opens ${formatStoreDateTime(startIso)} ${until}.`;
}

function remindersReadBack(rows: ReminderRow[]): string | null {
  const parsed = reminderOffsetsValidator.safeParse(rows.map(reminderRowMinutes));
  return parsed.success ? remindersSummary(parsed.data) : null;
}

function ReminderRows({
  id,
  rows,
  onChange,
  disabled,
  error,
}: {
  id: string;
  rows: ReminderRow[];
  onChange: (rows: ReminderRow[]) => void;
  disabled: boolean;
  error?: string;
}) {
  const update = (index: number, patch: Partial<ReminderRow>) =>
    onChange(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  return (
    <Field
      id={`${id}-0-amount`}
      label="Reminders"
      hint={`How long before opening each reminder is sent. Up to ${RELEASE_REMINDERS_MAX}.`}
      error={error}
      className="sm:col-span-2"
    >
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-3">
          <Input
            id={`${id}-${index}-amount`}
            type="number"
            inputMode="numeric"
            min={1}
            value={row.amount}
            disabled={disabled}
            aria-label={`Reminder ${index + 1} amount`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => update(index, { amount: event.target.value })}
            className="h-11 w-28"
          />
          <div className="w-36">
            <Select
              value={row.unit}
              disabled={disabled}
              aria-label={`Reminder ${index + 1} unit`}
              onChange={(event) => update(index, { unit: event.target.value as ReminderUnit })}
              className="h-11"
            >
              {REMINDER_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {REMINDER_UNIT_LABELS[unit]}
                </option>
              ))}
            </Select>
          </div>
          <span className="text-sm text-ink-secondary">before opening</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(rows.filter((_, at) => at !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || rows.length >= RELEASE_REMINDERS_MAX}
          onClick={() => onChange([...rows, NEW_REMINDER_ROW])}
        >
          Add reminder
        </Button>
      </div>
    </Field>
  );
}

export function ReleaseFields({
  values,
  onChange,
  errors,
  edits,
  autoFocus,
}: {
  values: ReleaseFormValues;
  onChange: (values: ReleaseFormValues) => void;
  errors: FieldErrors;
  edits?: ReleaseEdits;
  autoFocus?: boolean;
}) {
  const id = useId();
  const error = (field: string) => errors[field]?.[0];
  const set = <K extends keyof ReleaseFormValues>(key: K, value: ReleaseFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const locked = (key: keyof ReleaseEdits) => (edits ? !edits[key] : false);

  const startIso = fromStoreDateTimeInput(values.startsAt);
  const endIso = fromStoreDateTimeInput(values.endsAt);
  const windowInvalid = startIso !== null && endIso !== null && endsBeforeStart(startIso, endIso);
  const endsError = windowInvalid ? RELEASE_END_BEFORE_START : error("endsAt");
  const remindersNote = values.reminders === undefined ? null : remindersReadBack(values.reminders);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id={`${id}-title`} label="Title" error={error("title")}>
        <Input
          id={`${id}-title`}
          data-autofocus={autoFocus || undefined}
          value={values.title}
          maxLength={RELEASE_TITLE_MAX_LENGTH}
          disabled={locked("text")}
          onChange={(event) => set("title", event.target.value)}
          aria-invalid={error("title") ? true : undefined}
          className="h-11"
        />
      </Field>

      <Field id={`${id}-edition`} label="Edition" hint="Optional, e.g. Launch edition." error={error("edition")}>
        <Input
          id={`${id}-edition`}
          value={values.edition}
          maxLength={RELEASE_EDITION_MAX_LENGTH}
          disabled={locked("text")}
          onChange={(event) => set("edition", event.target.value)}
          aria-invalid={error("edition") ? true : undefined}
          className="h-11"
        />
      </Field>

      <Field
        id={`${id}-description`}
        label="Description"
        hint="Optional."
        error={error("description")}
        className="sm:col-span-2"
      >
        <Textarea
          id={`${id}-description`}
          value={values.description}
          maxLength={RELEASE_DESCRIPTION_MAX_LENGTH}
          disabled={locked("text")}
          rows={3}
          onChange={(event) => set("description", event.target.value)}
          aria-invalid={error("description") ? true : undefined}
        />
      </Field>

      <Field id={`${id}-starts`} label="Opens" hint="Store time (Dubai)." error={error("startsAt")}>
        <Input
          id={`${id}-starts`}
          type="datetime-local"
          value={values.startsAt}
          disabled={locked("startsAt")}
          onChange={(event) => set("startsAt", event.target.value)}
          aria-invalid={error("startsAt") ? true : undefined}
          className="h-11"
        />
      </Field>

      <Field id={`${id}-ends`} label="Ends" hint="Store time (Dubai). Needed before publishing." error={endsError}>
        <Input
          id={`${id}-ends`}
          type="datetime-local"
          value={values.endsAt}
          min={values.startsAt || undefined}
          disabled={locked("endsAt")}
          onChange={(event) => set("endsAt", event.target.value)}
          aria-invalid={endsError ? true : undefined}
          className="h-11"
        />
      </Field>

      {startIso && !windowInvalid && (
        <p className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-secondary sm:col-span-2">
          {saleWindow(startIso, endIso)}
        </p>
      )}

      <Field id={`${id}-max`} label="Max per customer" error={error("maxPerCustomer")}>
        <Input
          id={`${id}-max`}
          type="number"
          inputMode="numeric"
          min={1}
          max={RELEASE_MAX_PER_CUSTOMER_LIMIT}
          value={values.maxPerCustomer}
          disabled={locked("maxPerCustomer")}
          onChange={(event) => set("maxPerCustomer", event.target.value)}
          aria-invalid={error("maxPerCustomer") ? true : undefined}
          className="h-11"
        />
      </Field>

      <label className="inline-flex items-center gap-2 self-end pb-3 text-sm text-ink-secondary">
        <input
          type="checkbox"
          checked={values.hidden}
          disabled={locked("hidden")}
          onChange={(event) => set("hidden", event.target.checked)}
        />
        Hidden from the storefront
      </label>

      {values.reminders !== undefined && (
        <ReminderRows
          id={`${id}-reminder`}
          rows={values.reminders}
          onChange={(rows) => set("reminders", rows)}
          disabled={locked("reminders")}
          error={error("reminders")}
        />
      )}

      {remindersNote && (
        <p className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-secondary sm:col-span-2">
          {remindersNote}
        </p>
      )}
    </div>
  );
}

export function ReleaseFormModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title="New release">
      <ReleaseCreateForm onClose={onClose} />
    </Dialog>
  );
}

function ReleaseCreateForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState(() => releaseFormValues());
  const [errors, setErrors] = useState<FieldErrors>({});
  const createRelease = useCreateRelease();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseReleaseForm(values);
    if (parsed.errors) {
      setErrors(parsed.errors);
      return;
    }

    setErrors({});
    createRelease.mutate(parsed.data, {
      onSuccess: (release) => router.push(releaseAdminHref(release.id)),
      onError: (error) => setErrors(apiFieldErrors(error)),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <ReleaseFields values={values} onChange={setValues} errors={errors} autoFocus />
      </DialogBody>

      <DialogFooter>
        {createRelease.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {createRelease.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={createRelease.isPending}>
          Create release
        </Button>
      </DialogFooter>
    </form>
  );
}
