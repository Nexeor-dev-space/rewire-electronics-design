"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetReleaseSettings, useUpdateReleaseSettings } from "@/hooks/use-release";
import { apiFieldErrors } from "@/lib/api/api-client";
import { RELEASE_HOLD_MINUTES_MAX, RELEASE_MIN_PAYMENT_MINUTES } from "@/lib/constants";
import { formatOrderStamp } from "@/lib/dates";
import type { ReleaseSettingsView } from "@/types/release";
import { releaseSettingsSchema } from "@/validators/release.validator";

export function ReleaseSettingsDialog({ onClose }: { onClose: () => void }) {
  const settings = useGetReleaseSettings();

  return (
    <Dialog
      open
      onClose={onClose}
      title="Release hold time"
      description="How long checkout holds release items for a customer."
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
        <ReleaseSettingsForm settings={settings.data} onClose={onClose} />
      )}
    </Dialog>
  );
}

function ReleaseSettingsForm({ settings, onClose }: { settings: ReleaseSettingsView; onClose: () => void }) {
  const id = useId();
  const [minutes, setMinutes] = useState(String(settings.releaseHoldMinutes));
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const update = useUpdateReleaseSettings();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = Number(minutes);
    if (minutes.trim() === "" || Number.isNaN(value)) {
      setErrors({ releaseHoldMinutes: ["Enter a number of minutes."] });
      return;
    }

    const parsed = releaseSettingsSchema.safeParse({ releaseHoldMinutes: value });
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

  const error = errors.releaseHoldMinutes?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <Field
          id={`${id}-minutes`}
          label="Hold time in minutes"
          hint={`1 to ${RELEASE_HOLD_MINUTES_MAX} minutes.`}
          error={error}
        >
          <Input
            id={`${id}-minutes`}
            data-autofocus
            type="number"
            inputMode="numeric"
            min={1}
            max={RELEASE_HOLD_MINUTES_MAX}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            aria-invalid={error ? true : undefined}
            className="h-11"
          />
        </Field>

        <div className="mt-5 space-y-2 rounded-lg border border-line bg-surface p-4 text-sm text-ink-secondary">
          <p>
            When a customer opens checkout, their release items are held for this long so nobody else can
            buy them. Units the customer does not buy in time go back on sale.
          </p>
          <p>
            Card and Apple Pay orders always get at least {RELEASE_MIN_PAYMENT_MINUTES} minutes to pay, even
            when the hold is about to end.
          </p>
          <p>A change applies to holds made after you save it. Holds already running keep their end time.</p>
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
