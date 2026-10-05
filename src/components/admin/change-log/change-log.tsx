"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAuditLogs } from "@/hooks/use-audit-log";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  auditFieldLabel,
  auditModuleLabel,
  type AuditAction,
  type AuditValues,
} from "@/lib/audit";
import { ADMIN_MODULES, ROLE_LABELS } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types/audit";

const COLUMNS = "lg:grid-cols-[10rem_minmax(0,1.2fr)_9rem_minmax(0,1fr)_minmax(0,1.4fr)]";

/**
 * Governance → Change Log: every recorded admin change, newest first, with
 * filters by module and action and a search over the record and the person.
 * A row opens the previous and new values field by field.
 */
export function ChangeLog() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [moduleKey, setModuleKey] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AuditLogEntry | null>(null);

  const logs = useGetAuditLogs({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    module: moduleKey || undefined,
    action: action || undefined,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const filtered = Boolean(search || moduleKey || action);

  let content: ReactNode;
  if (logs.isPending) {
    content = <TableSkeleton />;
  } else if (logs.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{logs.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => logs.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (logs.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={filtered ? "No changes match" : "No changes recorded yet"}
        description={filtered ? "Nothing matches these filters." : "Changes made in the console appear here."}
      />
    );
  } else {
    const { items, total } = logs.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((entry) => (
              <li key={entry.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpen(entry)}
                  className={cn(
                    "grid w-full gap-x-4 gap-y-1 px-5 py-4 text-left transition-colors duration-(--duration-fast) hover:bg-surface-2 lg:items-center",
                    COLUMNS,
                  )}
                >
                  <time dateTime={entry.createdAt} className="text-sm tabular-nums text-ink-secondary">
                    {formatWhen(entry.createdAt)}
                  </time>
                  <p className="min-w-0 truncate text-sm text-ink">
                    {entry.actorName}
                    <span className="ml-2 text-xs text-ink-muted">{ROLE_LABELS[entry.actorRole]}</span>
                  </p>
                  <div>
                    <Badge variant={actionVariant(entry.action)} className="px-2 py-1 text-[0.625rem]">
                      {AUDIT_ACTION_LABELS[entry.action]}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-ink-secondary">{auditModuleLabel(entry.module)}</p>
                  <p className="truncate text-sm font-medium text-ink">{entry.recordLabel}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
              {page} / {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </nav>
        )}
      </>
    );
  }

  return (
    <AdminPage
      title="Change Log"
      description="Who changed what in the console, with the values before and after."
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by record or person"
          aria-label="Search the change log"
          className="h-10 sm:w-80"
        />
        <Select
          value={moduleKey}
          onChange={(event) => {
            setModuleKey(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by module"
          className="h-10 sm:w-52"
        >
          <option value="">All modules</option>
          {ADMIN_MODULES.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
            </option>
          ))}
        </Select>
        <Select
          value={action}
          onChange={(event) => {
            setAction(event.target.value as AuditAction | "");
            setPage(1);
          }}
          aria-label="Filter by action"
          className="h-10 sm:w-48"
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((value) => (
            <option key={value} value={value}>
              {AUDIT_ACTION_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}

      <Dialog
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? `${AUDIT_ACTION_LABELS[open.action]}: ${open.recordLabel}` : ""}
        description={
          open &&
          `${auditModuleLabel(open.module)} · ${open.actorName} (${ROLE_LABELS[open.actorRole]}) · ${formatWhen(open.createdAt)}`
        }
      >
        <DialogBody>{open && <ChangeDetail entry={open} />}</DialogBody>
      </Dialog>
    </AdminPage>
  );
}

function ChangeDetail({ entry }: { entry: AuditLogEntry }) {
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  if (fields.length === 0) {
    return <p className="text-sm text-ink-secondary">No field values were recorded for this action.</p>;
  }

  return (
    <dl className="flex flex-col gap-4">
      {fields.map((field) => (
        <div key={field} className="rounded-lg border border-line p-3">
          <dt className="eyebrow mb-2">{auditFieldLabel(field)}</dt>
          <dd className="grid gap-3 sm:grid-cols-2">
            <ValueCell label="Previous" present={entry.before !== null} value={before[field]} />
            <ValueCell label="New" present={entry.after !== null} value={after[field]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ValueCell({ label, present, value }: { label: string; present: boolean; value: AuditValues[string] }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs text-ink-muted">{label}</p>
      {present ? (
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-2 p-2 font-mono text-xs text-ink">
          {formatValue(value)}
        </pre>
      ) : (
        <p className="text-sm text-ink-muted">—</p>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionVariant(action: AuditAction) {
  if (action === "DELETE" || action === "PURGE") return "warn" as const;
  if (action === "CREATE" || action === "RESTORE" || action === "PUBLISH") return "live" as const;
  return "outline" as const;
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">When</p>
      <p className="eyebrow">Who</p>
      <p className="eyebrow">Action</p>
      <p className="eyebrow">Module</p>
      <p className="eyebrow">Record</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      <TableHeader />
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className={cn("grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}
