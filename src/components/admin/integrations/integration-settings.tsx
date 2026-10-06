"use client";

import { useState, type ReactNode } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteIntegrationCredential,
  useGetIntegrations,
  useSetIntegrationMode,
} from "@/hooks/use-integrations";
import {
  INTEGRATION_KEY_DEFAULTS,
  INTEGRATION_KEY_GROUPS,
  INTEGRATION_KEY_HELP,
  INTEGRATION_KEY_LABELS,
  INTEGRATION_MODES,
} from "@/lib/integration-keys";
import { cn } from "@/lib/utils";
import type {
  EmailTransport,
  IntegrationCredentialStatus,
  IntegrationKey,
  IntegrationMode,
  IntegrationStatus,
} from "@/types/integration";
import { CredentialFormModal } from "./credential-form-modal";

const EMAIL_TRANSPORT_LABELS: Record<EmailTransport, string> = {
  SMTP: "On (SMTP)",
  CONSOLE: "Logged to the server console",
  OFF: "Off",
};

type Modal = { kind: "add" | "replace"; key: IntegrationKey } | null;

export function IntegrationSettings() {
  const status = useGetIntegrations();
  const setMode = useSetIntegrationMode();
  const deleteCredential = useDeleteIntegrationCredential();

  const [pendingMode, setPendingMode] = useState<IntegrationMode | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<IntegrationCredentialStatus | null>(null);

  function confirmModeChange() {
    if (!pendingMode) return;
    setMode.mutate(pendingMode, {
      onSuccess: () => {
        setPendingMode(null);
        setMode.reset();
      },
    });
  }

  function cancelModeChange() {
    setPendingMode(null);
    setMode.reset();
  }

  function confirmDelete() {
    if (!toDelete) return;
    deleteCredential.mutate(toDelete.key, {
      onSuccess: () => {
        setToDelete(null);
        deleteCredential.reset();
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteCredential.reset();
  }

  let content: ReactNode;
  if (status.isPending) {
    content = <SettingsSkeleton />;
  } else if (status.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{status.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => status.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    const data: IntegrationStatus = status.data;
    const byKey = new Map(data.credentials.map((credential) => [credential.key, credential]));

    content = (
      <div className="grid gap-8">
        <section aria-labelledby="integrations-mode-heading" className="rounded-xl border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="integrations-mode-heading" className="text-sm font-medium text-ink">
                Mode
              </h2>
              <p className="mt-1 max-w-md text-sm text-ink-secondary">
                DEV keeps third party services off. LIVE reads the stored credentials below.
              </p>
            </div>
            <ModeSwitch mode={data.mode} disabled={setMode.isPending} onChange={setPendingMode} />
          </div>

          {data.mode === "DEV" && (
            <p className="mt-4 rounded-lg border border-warn/25 bg-warn/10 px-4 py-3 text-sm text-warn">
              Development mode: emails without SMTP print to the server log.
            </p>
          )}

          <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
            <div>
              <dt className="eyebrow text-ink-muted">Email</dt>
              <dd className="mt-1 text-sm text-ink">{EMAIL_TRANSPORT_LABELS[data.features.email]}</dd>
            </div>
          </dl>
        </section>

        {INTEGRATION_KEY_GROUPS.map((group) => (
          <section key={group.label} aria-labelledby={`integrations-group-${group.label}`}>
            <h2
              id={`integrations-group-${group.label}`}
              className="eyebrow mb-3 text-ink-secondary"
            >
              {group.label}
            </h2>
            <div className="overflow-hidden rounded-xl border border-line">
              <ul>
                {group.keys.map((key, index) => {
                  const credential = byKey.get(key) ?? {
                    key,
                    isSet: false,
                    readable: true,
                    hint: null,
                    updatedAt: null,
                  };
                  return (
                    <li key={key} className={cn(index > 0 && "border-t border-line")}>
                      <CredentialRow
                        credential={credential}
                        busy={deleteCredential.isPending && deleteCredential.variables === key}
                        onAdd={() => setModal({ kind: "add", key })}
                        onReplace={() => setModal({ kind: "replace", key })}
                        onDelete={() => setToDelete(credential)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <AdminPage
      title="API Credentials"
      description="Email delivery credentials and the DEV / LIVE switch."
    >
      {content}

      {modal && (
        <CredentialFormModal
          credentialKey={modal.key}
          isSet={modal.kind === "replace"}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={pendingMode !== null}
        title={pendingMode ? `Switch to ${pendingMode}?` : "Switch mode?"}
        description={
          pendingMode === "LIVE"
            ? "LIVE reads the stored credentials. A feature with a missing credential turns off on its own."
            : "DEV mode: emails without SMTP print to the server log instead of sending."
        }
        confirmLabel={pendingMode ? `Switch to ${pendingMode}` : "Switch"}
        error={setMode.isError ? setMode.error.message : undefined}
        loading={setMode.isPending}
        onCancel={cancelModeChange}
        onConfirm={confirmModeChange}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete ? INTEGRATION_KEY_LABELS[toDelete.key] : "credential"}?`}
        description="The feature that reads it turns off until it's set again."
        confirmLabel="Delete credential"
        error={deleteCredential.isError ? deleteCredential.error.message : undefined}
        loading={deleteCredential.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function ModeSwitch({
  mode,
  disabled,
  onChange,
}: {
  mode: IntegrationMode;
  disabled: boolean;
  onChange: (mode: IntegrationMode) => void;
}) {
  return (
    <div role="group" aria-label="Integration mode" className="inline-flex rounded-full border border-line-strong p-1">
      {INTEGRATION_MODES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          disabled={disabled || mode === value}
          onClick={() => onChange(value)}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.08em] transition-colors duration-(--duration-fast)",
            mode === value
              ? "bg-ink text-void"
              : "text-ink-secondary hover:text-ink disabled:opacity-40",
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function CredentialRow({
  credential,
  busy,
  onAdd,
  onReplace,
  onDelete,
}: {
  credential: IntegrationCredentialStatus;
  busy: boolean;
  onAdd: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const label = INTEGRATION_KEY_LABELS[credential.key];
  const help = INTEGRATION_KEY_HELP[credential.key];
  const defaultValue = INTEGRATION_KEY_DEFAULTS[credential.key];

  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-2 px-5 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem] lg:items-center",
        busy && "opacity-50",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{help}</p>
      </div>

      <div className="text-sm">
        {!credential.isSet ? (
          <p className="text-ink-secondary">
            Not set
            {defaultValue && <span className="text-ink-muted"> · Default: {defaultValue}</span>}
          </p>
        ) : !credential.readable ? (
          <p className="text-danger">Unreadable, re-enter it</p>
        ) : (
          <p className="text-ink-secondary">
            Set
            {credential.hint && <>, ends in …{credential.hint}</>}
            {credential.updatedAt && <>, updated {formatDate(credential.updatedAt)}</>}
          </p>
        )}
      </div>

      {credential.isSet ? (
        <RowActions name={label} disabled={busy} onEdit={onReplace} onDelete={onDelete} />
      ) : (
        <div className="lg:justify-self-end">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onAdd}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SettingsSkeleton() {
  return (
    <div aria-busy className="grid gap-8">
      <Skeleton className="h-32 w-full rounded-xl" />
      {Array.from({ length: 3 }, (_, groupIndex) => (
        <div key={groupIndex} className="overflow-hidden rounded-xl border border-line">
          {Array.from({ length: 2 }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 last:border-b-0"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
