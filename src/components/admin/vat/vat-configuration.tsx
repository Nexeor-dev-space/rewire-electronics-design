"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetVatSettings, useUpdateVatSettings } from "@/hooks/use-vat-settings";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { VAT_RATE_MAX_PERCENT } from "@/lib/constants";
import { formatOrderStamp } from "@/lib/dates";
import type { StoreSettingsView } from "@/types/return";
import { vatSettingsSchema } from "@/validators/vat.validator";
import { InvoiceDetailsSection } from "./invoice-details-section";

export function VatConfiguration() {
  const settings = useGetVatSettings();

  return (
    <AdminPage
      title="VAT & Configuration"
      description="Tax rates and the general configuration the rest of the console reads."
    >
      {settings.isPending ? (
        <div aria-busy className="max-w-xl rounded-xl border border-line p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-5 h-11 w-full" />
        </div>
      ) : settings.isError ? (
        <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
          <p className="text-sm text-ink-secondary">{settings.error.message}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => settings.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <VatRateSection settings={settings.data} />
      )}
      <InvoiceDetailsSection />
    </AdminPage>
  );
}

function VatRateSection({ settings }: { settings: StoreSettingsView }) {
  const id = useId();
  const { edit: canEdit } = useModuleAccess(PERMISSIONS.vat);
  const saved = String(settings.vatRatePercent);
  const [rate, setRate] = useState(saved);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [success, setSuccess] = useState(false);
  const update = useUpdateVatSettings();

  const dirty = rate !== saved;
  const error = errors.vatRatePercent?.[0];

  function handleChange(value: string) {
    setRate(value);
    setSuccess(false);
  }

  function handleCancel() {
    setRate(saved);
    setErrors({});
    setSuccess(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = Number(rate);
    if (rate.trim() === "" || Number.isNaN(value)) {
      setErrors({ vatRatePercent: ["Enter a VAT rate."] });
      return;
    }

    const parsed = vatSettingsSchema.safeParse({ vatRatePercent: value });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    update.mutate(parsed.data, {
      onSuccess: (result) => {
        setRate(String(result.vatRatePercent));
        setSuccess(true);
      },
      onError: (failure) => setErrors(apiFieldErrors(failure)),
    });
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="max-w-xl rounded-xl border border-line p-6">
      <h2 id={`${id}-heading`} className="text-base text-ink">
        VAT rate
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">
        The percentage of VAT included in prices at the cart and checkout.
      </p>

      {success && (
        <p role="status" className="mt-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-live">
          VAT rate saved.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-5">
        <Field
          id={`${id}-rate`}
          label="VAT rate (%)"
          hint={`A whole number from 0 to ${VAT_RATE_MAX_PERCENT}.`}
          error={error}
        >
          <Input
            id={`${id}-rate`}
            type="number"
            inputMode="numeric"
            min={0}
            max={VAT_RATE_MAX_PERCENT}
            value={rate}
            disabled={!canEdit}
            onChange={(event) => handleChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            className="h-11"
          />
        </Field>

        <div className="mt-5 space-y-2 rounded-lg border border-line bg-surface p-4 text-sm text-ink-secondary">
          <p>
            Prices already include VAT, so changing the rate does not change what customers pay. It changes
            how much of each total is recorded as VAT.
          </p>
          <p>
            A change applies to new carts and orders only. Orders already placed keep the rate and VAT amount
            they were placed with.
          </p>
        </div>

        {settings.updatedAt && (
          <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
            Last changed {formatOrderStamp(settings.updatedAt)}
          </p>
        )}

        {canEdit ? (
          <div className="mt-6 flex items-center justify-end gap-3">
            {update.isError && !error && (
              <p role="alert" className="mr-auto text-sm text-danger">
                {update.error.message}
              </p>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={!dirty}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={update.isPending} disabled={!dirty}>
              Save
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-ink-muted">Your role can view this setting but not change it.</p>
        )}
      </form>
    </section>
  );
}
