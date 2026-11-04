"use client";

import { useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDownloadImportErrors,
  useGetProductImport,
  useGetProductImportRows,
  useGetProductImports,
  useProcessProductImport,
} from "@/hooks/use-product-import";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import {
  IMPORT_MODE_LABELS,
  IMPORT_STATUS_LABELS,
  isImportUnfinished,
  runImportToEnd,
  type ImportRowStatus,
  type ImportStatus,
} from "@/lib/product-import";
import { cn } from "@/lib/utils";
import type { ProductImportItem } from "@/types/product-import";

const COLUMNS =
  "grid-cols-[minmax(6rem,1fr)_minmax(10rem,2fr)_minmax(8rem,1.5fr)_minmax(10rem,1.5fr)_4rem_5rem_4rem_minmax(9rem,1.5fr)_minmax(10rem,1.5fr)]";

const STATUS_TONE: Record<ImportStatus, string> = {
  PENDING: "text-ink-secondary",
  PROCESSING: "text-warn",
  COMPLETED: "text-live",
  COMPLETED_WITH_ERRORS: "text-warn",
  FAILED: "text-danger",
};

/** The last characters of the id are the part that differs, so that is what the table shows. */
const shortId = (id: string) => id.slice(-8).toUpperCase();

export function ProductImportHistory() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const imports = useGetProductImports({ page, pageSize: ADMIN_PAGE_SIZE });
  const downloadErrors = useDownloadImportErrors();

  let content: ReactNode;
  if (imports.isPending) {
    content = <Skeleton className="h-64 w-full rounded-xl" />;
  } else if (imports.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{imports.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => imports.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (imports.data.items.length === 0) {
    content = (
      <AdminEmptyState title="No imports yet" description="Files you import from Bulk Product Upload appear here." />
    );
  } else {
    const { items, total } = imports.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    content = (
      <>
        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="min-w-[72rem]">
            <div
              className={cn(
                "grid gap-x-4 border-b border-line bg-surface-2 px-5 py-3 text-xs uppercase tracking-wide text-ink-muted",
                COLUMNS,
              )}
            >
              <span>Import ID</span>
              <span>File</span>
              <span>Uploaded by</span>
              <span>Uploaded</span>
              <span>Total</span>
              <span>Imported</span>
              <span>Failed</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b border-line last:border-b-0">
                  <div className={cn("grid items-center gap-x-4 px-5 py-3 text-sm", COLUMNS)}>
                    <span className="font-mono text-xs text-ink">{shortId(item.id)}</span>
                    <span className="min-w-0 break-words text-ink">{item.fileName}</span>
                    <span className="min-w-0 text-ink-secondary">{item.uploadedByName}</span>
                    <time dateTime={item.createdAt} className="text-ink-secondary">
                      {formatStoreDateTime(item.createdAt)}
                    </time>
                    <span className="tabular-nums text-ink">{item.totalRows}</span>
                    <span className="tabular-nums text-live">{item.importedRows}</span>
                    <span className={cn("tabular-nums", item.failedRows > 0 ? "text-danger" : "text-ink-secondary")}>
                      {item.failedRows}
                    </span>
                    <span className={cn("font-medium", STATUS_TONE[item.status])}>{IMPORT_STATUS_LABELS[item.status]}</span>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(item.id)}>
                        {isImportUnfinished(item.status) ? "Resume" : "Details"}
                      </Button>
                      {item.failedRows > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={downloadErrors.isPending}
                          onClick={() => downloadErrors.mutate(item.id)}
                        >
                          Error report
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
    <AdminPage title="Import history" description="Every bulk product upload, who ran it, and how it went.">
      {content}
      {openId && <ImportDetailDialog id={openId} onClose={() => setOpenId(null)} />}
    </AdminPage>
  );
}

const ROW_TABS: { label: string; status: ImportRowStatus | undefined }[] = [
  { label: "Failed", status: "FAILED" },
  { label: "Imported", status: "IMPORTED" },
  { label: "All", status: undefined },
];

function ImportDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const access = useModuleAccess(PERMISSIONS.bulkUpload);
  const detail = useGetProductImport(id);
  const processImport = useProcessProductImport();
  const downloadErrors = useDownloadImportErrors();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const record: ProductImportItem | undefined = processImport.data ?? detail.data;
  const status = ROW_TABS[tab]?.status;
  const rows = useGetProductImportRows(id, { page, pageSize: ADMIN_PAGE_SIZE, status });

  async function resume(current: ProductImportItem) {
    setResumeError(null);
    try {
      await runImportToEnd(current, (importId) => processImport.mutateAsync(importId));
      await detail.refetch();
      await rows.refetch();
    } catch (error) {
      setResumeError(error instanceof Error ? error.message : "The import stopped unexpectedly.");
    }
  }

  const pages = rows.data ? Math.max(1, Math.ceil(rows.data.total / ADMIN_PAGE_SIZE)) : 1;

  return (
    <Dialog
      open
      onClose={onClose}
      title={record ? record.fileName : "Import details"}
      description={record ? `${IMPORT_MODE_LABELS[record.mode]} · ${shortId(record.id)}` : undefined}
      className="sm:max-w-3xl"
    >
      <DialogBody>
        {detail.isPending ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : detail.isError || !record ? (
          <p role="alert" className="text-sm text-danger">
            {detail.error?.message ?? "We couldn't load this import."}
          </p>
        ) : (
          <>
            <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Status" value={IMPORT_STATUS_LABELS[record.status]} tone={STATUS_TONE[record.status]} />
              <Figure label="Total" value={String(record.totalRows)} />
              <Figure label="Imported" value={String(record.importedRows)} tone="text-live" />
              <Figure label="Failed" value={String(record.failedRows)} tone={record.failedRows > 0 ? "text-danger" : undefined} />
            </dl>

            {isImportUnfinished(record.status) && (
              <div className="mb-5 rounded-xl border border-line bg-surface-2 px-4 py-3">
                <p className="text-sm text-ink-secondary">
                  This import was not finished. Resume to save the rows that are left.
                </p>
                {resumeError && (
                  <p role="alert" className="mt-2 text-sm text-danger">
                    {resumeError}
                  </p>
                )}
                {access.create && (
                  <Button size="sm" className="mt-3" disabled={processImport.isPending} onClick={() => resume(record)}>
                    {processImport.isPending ? "Importing" : "Resume import"}
                  </Button>
                )}
              </div>
            )}

            <div className="mb-3 flex gap-2" role="group" aria-label="Rows to show">
              {ROW_TABS.map((entry, index) => (
                <Button
                  key={entry.label}
                  size="sm"
                  variant={tab === index ? "primary" : "outline"}
                  aria-pressed={tab === index}
                  onClick={() => {
                    setTab(index);
                    setPage(1);
                  }}
                >
                  {entry.label}
                </Button>
              ))}
            </div>

            {rows.isPending ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : rows.isError ? (
              <p role="alert" className="text-sm text-danger">
                {rows.error.message}
              </p>
            ) : rows.data.items.length === 0 ? (
              <p className="rounded-xl border border-line bg-surface-2 px-6 py-8 text-center text-sm text-ink-secondary">
                No rows to show.
              </p>
            ) : (
              <ul className="rounded-xl border border-line">
                {rows.data.items.map((row) => (
                  <li key={row.id} className="border-b border-line px-4 py-3 text-sm last:border-b-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-ink">
                        <span className="mr-2 font-mono text-xs text-ink-secondary">Row {row.rowNumber}</span>
                        {row.productName}
                      </span>
                      <span className="font-mono text-xs text-ink-secondary">{row.sku}</span>
                    </div>
                    {row.error && <p className="mt-1 text-xs text-danger">{row.error}</p>}
                  </li>
                ))}
              </ul>
            )}

            {pages > 1 && (
              <nav aria-label="Pagination" className="mt-3 flex items-center justify-end gap-2">
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
        )}
      </DialogBody>
      <DialogFooter>
        {record && record.failedRows > 0 && (
          <Button variant="outline" size="sm" disabled={downloadErrors.isPending} onClick={() => downloadErrors.mutate(id)}>
            Download error report
          </Button>
        )}
        <Button size="sm" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={cn("mt-1 text-base tabular-nums text-ink", tone)}>{value}</dd>
    </div>
  );
}
