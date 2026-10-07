"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetStoreSettings, useUpdateStoreSettings } from "@/hooks/use-store-settings";
import { apiFieldErrors } from "@/lib/api/api-client";
import { RETURN_WINDOW_MAX_DAYS } from "@/lib/constants";
import { formatOrderStamp } from "@/lib/dates";
import type { StoreSettingsView } from "@/types/return";
import { storeSettingsSchema } from "@/validators/return.validator";

export function ReturnWindowDialog({ onClose }: { onClose: () => void }) {
  const settings = useGetStoreSettings();

  return (
    <Dialog
      open
      onClose={onClose}
      title="Return window"
      description="How many days after delivery a customer can request a return."
      className="max-w-lg"
    >
      {settings.isPending ? (
        <DialogBody>
          <Skeleton className="h-11 w-full" />
        </DialogBody>
      ) : settings.isError ? (
        <DialogBody>
          <p role="alert" className="text-sm text-danger">
            {settings.error.message}
          </p>
        </DialogBody>
      ) : (
        <ReturnWindowForm settings={settings.data} onClose={onClose} />
      )}
    </Dialog>
  );
}

function ReturnWindowForm({ settings, onClose }: { settings: StoreSettingsView; onClose: () => void }) {
  const id = useId();
  const [days, setDays] = useState(String(settings.returnWindowDays));
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const update = useUpdateStoreSettings();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = Number(days);
    if (days.trim() === "" || Number.isNaN(value)) {
      setErrors({ returnWindowDays: ["Enter a number of days."] });
      return;
    }

    const parsed = storeSettingsSchema.safeParse({ returnWindowDays: value });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    update.mutate(parsed.data, {
      onSuccess: () => onClose(),
      onError: (error) => setErrors(apiFieldErrors(error)),
    });
  }

  const error = errors.returnWindowDays?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <Field
          id={`${id}-days`}
          label="Days after delivery"
          hint={`0 to ${RETURN_WINDOW_MAX_DAYS} days.`}
          error={error}
        >
          <Input
            id={`${id}-days`}
            data-autofocus
            type="number"
            inputMode="numeric"
            min={0}
            max={RETURN_WINDOW_MAX_DAYS}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            aria-invalid={error ? true : undefined}
            className="h-11"
          />
        </Field>

        <div className="mt-5 space-y-2 rounded-lg border border-line bg-surface p-4 text-sm text-ink-secondary">
          <p>
            A change applies only to orders delivered after you save it. Orders already delivered keep the
            window they were given.
          </p>
          <p>0 days makes orders delivered from now on non returnable.</p>
        </div>

        {settings.updatedAt && (
          <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
            Last changed {formatOrderStamp(settings.updatedAt)}
          </p>
        )}
      </DialogBody>

      <DialogFooter>
        {update.isError && !error && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {update.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={update.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
