"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { DetailRow } from "@/components/admin/shared/detail-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTestIntegration, useUpdateIntegration } from "@/hooks/use-integrations";
import { apiFieldErrors } from "@/lib/api/api-client";
import { formatStoreDateTime } from "@/lib/dates";
import { integrationDefinition, type IdIntegration } from "@/lib/integrations";
import { cn } from "@/lib/utils";
import type { IntegrationStatus, IntegrationView } from "@/types/integration";
import { integrationValueSchemas } from "@/validators/integration.validator";

export const INTEGRATION_CARD = "rounded-xl border border-line p-6";

const STAMP = "font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted";

const PILL_TONES = {
  live: "bg-live/10 text-live",
  warn: "bg-warn/10 text-warn",
  muted: "bg-surface-2 text-ink-muted",
};

export function IntegrationRow({ integration, canEdit }: { integration: IntegrationView; canEdit: boolean }) {
  const id = useId();
  const definition = integrationDefinition(integration.key);

  return (
    <section aria-labelledby={`${id}-heading`} className={INTEGRATION_CARD}>
      <h2 id={`${id}-heading`} className="text-base text-ink">
        {definition.label}
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">{definition.purpose}</p>

      {definition.kind === "ID" ? (
        <IdValueForm integration={integration} definition={definition} canEdit={canEdit} />
      ) : (
        <EnvStatus status={integration.status} />
      )}

      <TestPanel integration={integration} canEdit={canEdit} />
    </section>
  );
}

function IdValueForm({
  integration,
  definition,
  canEdit,
}: {
  integration: IntegrationView;
  definition: IdIntegration;
  canEdit: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(integration.value);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [saved, setSaved] = useState(false);
  const update = useUpdateIntegration();

  const dirty = value !== integration.value;
  const error = errors.value?.[0];

  function handleChange(next: string) {
    setValue(next);
    setSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || !dirty) return;

    const parsed = integrationValueSchemas[definition.key].safeParse({ value });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    update.mutate(
      { key: definition.key, ...parsed.data },
      {
        onSuccess: (result) => {
          setValue(result.value);
          setSaved(true);
        },
        onError: (failure) => setErrors(apiFieldErrors(failure)),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5">
      <Field
        id={`${id}-value`}
        label="ID"
        hint={`Format: ${definition.hint}, for example ${definition.example}. Leave empty to turn it off.`}
        error={error}
        className="break-words"
      >
        <Input
          id={`${id}-value`}
          value={value}
          readOnly={!canEdit}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => handleChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          className="h-11"
        />
      </Field>
      <p className="mt-3 text-sm text-ink-secondary">{definition.whereToGet}</p>

      {integration.changedAt && (
        <p className={cn("mt-4", STAMP)}>
          Last changed {formatStoreDateTime(integration.changedAt)}
          {integration.changedBy && ` by ${integration.changedBy}`}
        </p>
      )}

      {canEdit && (
        <div className="mt-5 flex items-center justify-end gap-3">
          {update.isError && !error && (
            <p role="alert" className="mr-auto text-sm text-danger">
              {update.error.message}
            </p>
          )}
          {saved && (
            <p role="status" className="mr-auto text-sm text-live">
              Saved.
            </p>
          )}
          <Button type="submit" size="sm" loading={update.isPending} disabled={!dirty}>
            Save
          </Button>
        </div>
      )}
    </form>
  );
}

function EnvStatus({ status }: { status: IntegrationStatus | null }) {
  const configured = status?.configured ?? false;

  return (
    <div className="mt-5">
      <Pill tone={configured ? "live" : "muted"}>{configured ? "Configured" : "Not configured"}</Pill>
      {status && status.details.length > 0 && (
        <dl className="mt-3 divide-y divide-line">
          {status.details.map((detail) => (
            <DetailRow key={detail.label} label={detail.label}>
              {detail.value}
            </DetailRow>
          ))}
        </dl>
      )}
      <p className="mt-3 text-sm text-ink-secondary">
        These values are set in the deployment environment (Coolify). Secrets are never shown here.
      </p>
    </div>
  );
}

function TestPanel({ integration, canEdit }: { integration: IntegrationView; canEdit: boolean }) {
  const test = useTestIntegration();
  const { lastTest } = integration;

  return (
    <div className="mt-5 flex flex-wrap items-start gap-4 border-t border-line pt-5">
      {canEdit && (
        <Button variant="outline" size="sm" loading={test.isPending} onClick={() => test.mutate(integration.key)}>
          Test
        </Button>
      )}
      <div aria-live="polite" className="min-w-0 flex-1">
        {lastTest ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Pill tone={lastTest.ok ? "live" : "warn"}>{lastTest.ok ? "Passed" : "Failed"}</Pill>
              <p className={STAMP}>Tested {formatStoreDateTime(lastTest.at)}</p>
            </div>
            {lastTest.message && <p className="mt-2 text-sm text-ink-secondary">{lastTest.message}</p>}
          </>
        ) : (
          <p className="text-sm text-ink-muted">Not tested yet</p>
        )}
        {test.isError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {test.error.message}
          </p>
        )}
      </div>
    </div>
  );
}

function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em]",
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
