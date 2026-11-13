"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { useModuleAccess } from "@/components/admin/admin-access";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PhoneField } from "@/components/ui/phone-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInvoiceSettings, useUpdateInvoiceSettings } from "@/hooks/use-vat-settings";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatOrderStamp } from "@/lib/dates";
import type { InvoiceSettingsInput, InvoiceSettingsView } from "@/types/invoice";
import { invoiceSettingsSchema } from "@/validators/invoice.validator";

/**
 * Contact & invoice details — the one place for the store's contact
 * information (docs/VAT.md) and the seller block printed on every tax
 * invoice (docs/INVOICES.md). Lives on the VAT & Configuration screen under
 * the same permission as the VAT rate.
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
  const { sellerName, sellerTrn, sellerAddress, sellerEmail, phone, whatsapp, supportHours, terms } = settings;
  return { sellerName, sellerTrn, sellerAddress, sellerEmail, phone, whatsapp, supportHours, terms };
}

type TextKey = "sellerName" | "sellerTrn" | "sellerAddress" | "sellerEmail";
type PhoneKey = "phone" | "whatsapp";

const TEXT_FIELDS: { key: TextKey; label: string; hint: string }[] = [
  { key: "sellerName", label: "Legal name", hint: "Shown on tax invoices, under Sold by and in the footer." },
  { key: "sellerTrn", label: "TRN", hint: "Shown on tax invoices. The 15 digit Tax Registration Number. Leave empty to hide it." },
  { key: "sellerAddress", label: "Address", hint: "Shown on tax invoices. Leave empty to hide it." },
  {
    key: "sellerEmail",
    label: "Support email",
    hint: "Shown in the header menu, Support page, footer, product pages, policy pages, order screens, emails and invoices.",
  },
];

const PHONE_FIELDS: { key: PhoneKey; label: string; hint: string }[] = [
  {
    key: "phone",
    label: "Phone number",
    hint: "Shown in the header menu, Support page, footer, product pages, order screens and emails. Customers tap it to call.",
  },
  {
    key: "whatsapp",
    label: "WhatsApp number",
    hint: "Live Chat opens a WhatsApp chat with this number. Without one, Live Chat is not shown. Also in emails.",
  },
];

const HOURS_HINT = "Plain text in Gulf time, one line per row. Shown wherever support hours appear. Leave empty to hide it.";

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
        Contact &amp; invoice details
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">
        The store&apos;s contact details, shown across the storefront, in emails and on tax invoices, and the seller
        details and terms printed on every invoice. A field left empty is not shown anywhere. Changes show on the
        next page load, and apply to the next invoice download, including invoices already issued.
      </p>

      {success && (
        <p role="status" className="mt-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-live">
          Contact &amp; invoice details saved.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        {TEXT_FIELDS.map((field) => (
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

        {PHONE_FIELDS.map((field) => (
          <PhoneField
            key={field.key}
            id={`${id}-${field.key}`}
            label={field.label}
            hint={field.hint}
            value={values[field.key]}
            error={errors[field.key]?.[0]}
            onChange={(value) => handleChange(field.key, value)}
            disabled={!canEdit}
            controlClassName="h-11"
          />
        ))}

        <Field id={`${id}-supportHours`} label="Support hours" hint={HOURS_HINT} error={errors.supportHours?.[0]}>
          <Textarea
            id={`${id}-supportHours`}
            rows={2}
            value={values.supportHours}
            disabled={!canEdit}
            onChange={(event) => handleChange("supportHours", event.target.value)}
            aria-invalid={errors.supportHours ? true : undefined}
          />
        </Field>

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
