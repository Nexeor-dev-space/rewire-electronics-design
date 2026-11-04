"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { useModuleAccess } from "@/components/admin/admin-access";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInvoiceSettings, useUpdateInvoiceSettings } from "@/hooks/use-vat-settings";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatOrderStamp } from "@/lib/dates";
import type { InvoiceSettingsInput, InvoiceSettingsView } from "@/types/invoice";
import { invoiceSettingsSchema } from "@/validators/invoice.validator";

/**
 * Invoice details — the seller block printed on every tax invoice
 * (docs/INVOICES.md). Lives on the VAT & Configuration screen under the
 * same permission as the VAT rate.
 */
export function InvoiceDetailsSection() {
  const settings = useGetInvoiceSettings();

  if (settings.isPending) {
    return (
      <div aria-busy className="mt-6 max-w-xl rounded-xl border border-line p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-5 h-11 w-full" />
        <Skeleton className="mt-4 h-11 w-full" />
      </div>
    );
  }

  if (settings.isError) {
    return (
      <div role="alert" className="mt-6 max-w-xl rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{settings.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => settings.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return <InvoiceDetailsForm settings={settings.data} />;
}

type FormValues = Required<InvoiceSettingsInput>;

function toValues(settings: InvoiceSettingsView): FormValues {
  const { sellerName, sellerTrn, sellerAddress, sellerEmail, terms } = settings;
  return { sellerName, sellerTrn, sellerAddress, sellerEmail, terms };
}

const FIELDS: { key: Exclude<keyof FormValues, "terms">; label: string; hint?: string }[] = [
  { key: "sellerName", label: "Legal name", hint: "Printed under Sold by and in the footer." },
  { key: "sellerTrn", label: "TRN", hint: "The 15 digit Tax Registration Number. Leave empty to hide it." },
  { key: "sellerAddress", label: "Address" },
  { key: "sellerEmail", label: "Support email" },
];

function InvoiceDetailsForm({ settings }: { settings: InvoiceSettingsView }) {
  const id = useId();
  const { edit: canEdit } = useModuleAccess(PERMISSIONS.vat);
  const saved = toValues(settings);
  const [values, setValues] = useState<FormValues>(saved);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [success, setSuccess] = useState(false);
  const update = useUpdateInvoiceSettings();

  const dirty = (Object.keys(saved) as (keyof FormValues)[]).some((key) => values[key] !== saved[key]);

  function handleChange(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSuccess(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = invoiceSettingsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    update.mutate(parsed.data, {
      onSuccess: (result) => {
        setValues(toValues(result));
        setSuccess(true);
      },
      onError: (failure) => setErrors(apiFieldErrors(failure)),
    });
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="mt-6 max-w-xl rounded-xl border border-line p-6">
      <h2 id={`${id}-heading`} className="text-base text-ink">
        Invoice details
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">
        The seller details and terms printed on every tax invoice. Changes apply to the next download, including
        invoices already issued.
      </p>

      {success && (
        <p role="status" className="mt-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-live">
          Invoice details saved.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        {FIELDS.map((field) => (
          <Field
            key={field.key}
            id={`${id}-${field.key}`}
            label={field.label}
            hint={field.hint}
            error={errors[field.key]?.[0]}
          >
            <Input
              id={`${id}-${field.key}`}
              value={values[field.key]}
              disabled={!canEdit}
              inputMode={field.key === "sellerTrn" ? "numeric" : undefined}
              type={field.key === "sellerEmail" ? "email" : "text"}
              onChange={(event) => handleChange(field.key, event.target.value)}
              aria-invalid={errors[field.key] ? true : undefined}
              className="h-11"
            />
          </Field>
        ))}

        <Field
          id={`${id}-terms`}
          label="Terms & Conditions"
          hint="One point per line. Printed as a numbered list. Leave empty to hide the section."
          error={errors.terms?.[0]}
        >
          <Textarea
            id={`${id}-terms`}
            rows={5}
            value={values.terms}
            disabled={!canEdit}
            onChange={(event) => handleChange("terms", event.target.value)}
            aria-invalid={errors.terms ? true : undefined}
          />
        </Field>

        {settings.updatedAt && (
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
            Settings last changed {formatOrderStamp(settings.updatedAt)}
          </p>
        )}

        {canEdit ? (
          <div className="flex items-center justify-end gap-3 pt-2">
            {update.isError && Object.keys(errors).length === 0 && (
              <p role="alert" className="mr-auto text-sm text-danger">
                {update.error.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!dirty}
              onClick={() => {
                setValues(saved);
                setErrors({});
                setSuccess(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={update.isPending} disabled={!dirty}>
              Save
            </Button>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">Your role can view these details but not change them.</p>
        )}
      </form>
    </section>
  );
}
