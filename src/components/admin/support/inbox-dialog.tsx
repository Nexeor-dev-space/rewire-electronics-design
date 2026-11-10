"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSupportSettings, useUpdateSupportSettings } from "@/hooks/use-support";
import { apiFieldErrors } from "@/lib/api/api-client";
import { supportSettingsSchema } from "@/validators/support.validator";

export function InboxDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="Support inbox"
      description="Tickets customers raise on the website are also emailed to this address."
      className="max-w-md"
    >
      <InboxForm onClose={onClose} />
    </Dialog>
  );
}

function InboxForm({ onClose }: { onClose: () => void }) {
  const id = useId();
  const settings = useGetSupportSettings();
  const update = useUpdateSupportSettings();
  const [email, setEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const saved = settings.data?.inboxEmail ?? "";
  const value = email ?? saved;
  const error = errors.inboxEmail?.[0];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = supportSettingsSchema.safeParse({ inboxEmail: value });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    update.mutate(parsed.data, { onSuccess: onClose, onError: (failure) => setErrors(apiFieldErrors(failure)) });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        {settings.isPending ? (
          <Skeleton className="h-11 w-full" />
        ) : (
          <Field
            id={`${id}-email`}
            label="Inbox email address"
            hint="The ticket is always saved here in the admin console too. This is an extra copy by email."
            error={error}
          >
            <Input
              id={`${id}-email`}
              data-autofocus
              type="email"
              value={value}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined}
              className="h-11"
            />
          </Field>
        )}
        {settings.isError && <p className="mt-3 text-sm text-danger">{settings.error.message}</p>}
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
        <Button type="submit" size="sm" loading={update.isPending} disabled={!settings.data || value === saved}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
