"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useSetIntegrationCredential } from "@/hooks/use-integrations";
import { apiFieldErrors } from "@/lib/api/api-client";
import {
  INTEGRATION_KEY_LABELS,
  MULTILINE_INTEGRATION_KEYS,
  SECRET_INTEGRATION_KEYS,
} from "@/lib/integration-keys";
import type { IntegrationKey } from "@/types/integration";

/**
 * Add or replace one credential. Never prefilled, even when replacing a
 * value that is already set — the stored value never leaves the server, so
 * there is nothing to show here besides a blank field. Whatever is typed is
 * dropped the moment this closes: it only lives in this component's own
 * state, which unmounts with it.
 */
interface CredentialFormModalProps {
  credentialKey: IntegrationKey;
  isSet: boolean;
  onClose: () => void;
}

export function CredentialFormModal({ credentialKey, isSet, onClose }: CredentialFormModalProps) {
  const id = useId();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const setCredential = useSetIntegrationCredential();

  const label = INTEGRATION_KEY_LABELS[credentialKey];
  const secret = SECRET_INTEGRATION_KEYS.includes(credentialKey);
  const multiline = MULTILINE_INTEGRATION_KEYS.includes(credentialKey);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(undefined);

    setCredential.mutate(
      { key: credentialKey, value },
      {
        onSuccess: () => onClose(),
        onError: (error) => setFieldError(apiFieldErrors(error).value?.[0]),
      },
    );
  }

  return (
    <Dialog open onClose={onClose} title={isSet ? `Replace ${label}` : `Add ${label}`}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <DialogBody>
          <Field id={`${id}-value`} label={label} error={fieldError}>
            {multiline ? (
              <Textarea
                id={`${id}-value`}
                data-autofocus
                autoComplete="off"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={fieldError ? true : undefined}
                className="min-h-40 font-mono text-xs"
              />
            ) : (
              <Input
                id={`${id}-value`}
                data-autofocus
                type={secret ? "password" : "text"}
                autoComplete="off"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={fieldError ? true : undefined}
                className="h-11"
              />
            )}
          </Field>
        </DialogBody>

        <DialogFooter>
          {setCredential.isError && !fieldError && (
            <p role="alert" className="mr-auto text-sm text-danger">
              {setCredential.error.message}
            </p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={setCredential.isPending}>
            {isSet ? "Save changes" : "Add"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
