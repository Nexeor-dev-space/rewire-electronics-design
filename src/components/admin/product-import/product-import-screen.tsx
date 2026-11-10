"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useCreateProductImport,
  useDownloadImportErrors,
  useProcessProductImport,
  useValidateProductImport,
} from "@/hooks/use-product-import";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_PRODUCT_IMPORT_HISTORY_PATH, PRODUCT_IMPORT_EXCEL_TEMPLATE_PATH } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import { formatBytes } from "@/lib/media";
import {
  IMPORT_COLUMNS,
  IMPORT_FILE_ACCEPT,
  IMPORT_MODES,
  IMPORT_MODE_HINTS,
  IMPORT_MODE_LABELS,
  IMPORT_STATUS_LABELS,
  IMPORT_TEMPLATE_FILENAME,
  ImportFileError,
  buildImportTemplate,
  checkImportFile,
  importColumnHeader,
  isExcelFile,
  missingColumns,
  parseImportFile,
  runImportToEnd,
  type ImportMode,
  type ParsedImportFile,
} from "@/lib/product-import";
import { readTemplateFile } from "@/lib/product-import-template";
import { cn } from "@/lib/utils";
import type { ImportPreview, ProductImportItem } from "@/types/product-import";
import { ImportDropZone } from "./import-drop-zone";
import { ImportPreviewTable } from "./import-preview-table";
import { ImportRowsList } from "./import-rows-list";

interface PickedFile {
  name: string;
  size: number;
}

/** Where the import is: saving the file, saving products a batch at a time, finished, or broken off. */
type Run =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "running"; record: ProductImportItem }
  | { phase: "done"; record: ProductImportItem }
  | { phase: "stopped"; record: ProductImportItem | null; message: string };

export function ProductImportScreen() {
  const access = useModuleAccess(PERMISSIONS.bulkUpload);
  const validate = useValidateProductImport();
  const createImport = useCreateProductImport();
  const processImport = useProcessProductImport();
  const downloadErrors = useDownloadImportErrors();
  const [run, setRun] = useState<Run>({ phase: "idle" });
  const [mode, setMode] = useState<ImportMode>("CREATE_NEW");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function check(next: ParsedImportFile, nextMode: ImportMode) {
    if (next.source === "XLSX" && nextMode !== "CREATE_NEW") {
      validate.reset();
      setFileError("The Excel product sheet only creates products. Choose Create New, or upload a CSV to update.");
      return;
    }
    const absent = missingColumns(next.columns, nextMode);
    if (absent.length > 0) {
      validate.reset();
      setFileError(
        `${IMPORT_MODE_LABELS[nextMode]} needs the column ${absent.map(importColumnHeader).join(", ")}. Add it and upload the file again.`,
      );
      return;
    }
    setFileError(null);
    validate.mutate({ mode: nextMode, file: next });
  }

  function clear() {
    setRun({ phase: "idle" });
    validate.reset();
    setFile(null);
    setParsed(null);
    setFileError(null);
  }

  async function handleFile(next: File) {
    clear();
    try {
      checkImportFile(next);
      setFile({ name: next.name, size: next.size });
      const result = isExcelFile(next.name) ? await readTemplateFile(next) : parseImportFile(await next.text());
      setParsed(result);
      check(result, mode);
    } catch (error) {
      setFileError(error instanceof ImportFileError ? error.message : "We couldn't read that file.");
    }
  }

  function changeMode(next: ImportMode) {
    setMode(next);
    if (parsed) check(parsed, next);
  }

  /** Saves the file, then asks for batches until none are left. Safe to call again on a record that stopped. */
  async function startImport(existing?: ProductImportItem) {
    if (!parsed || !file) return;
    let record = existing ?? null;
    try {
      if (!record) {
        setRun({ phase: "saving" });
        record = await createImport.mutateAsync({ mode, file: parsed, fileName: file.name });
      }
      setRun({ phase: "running", record });
      record = await runImportToEnd(
        record,
        (importId) => processImport.mutateAsync(importId),
        (progress) => setRun({ phase: "running", record: progress }),
      );
      setRun({ phase: "done", record });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The import stopped unexpectedly.";
      setRun({ phase: "stopped", record, message });
    }
  }

  const preview = validate.data;
  const busy = run.phase === "saving" || run.phase === "running";

  return (
    <AdminPage
      title="Bulk Product Upload"
      description="Create or update products and their variants from a CSV file or the Excel product sheet. Every row is checked before anything is saved."
      actions={
        <Link
          href={ADMIN_PRODUCT_IMPORT_HISTORY_PATH}
          className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-sm text-ink hover:border-accent hover:bg-accent hover:text-white"
        >
          Import history
        </Link>
      }
    >
      <div className="space-y-10">
        <Step number={1} title="Download a template">
          <p className="text-sm text-ink-secondary">
            Use the Excel sheet to create products, with Parent and Variant rows. Use the CSV to create or update them:
            one row is one variant, and rows with the same product_slug make up one product. The columns below are the
            CSV&apos;s.
          </p>
          <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Template columns">
            {IMPORT_COLUMNS.map((column) => (
              <li key={column.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-mono text-xs text-ink">{column.header}</span>
                <span className={cn("text-xs", column.required ? "text-warn" : "text-ink-muted")}>
                  {column.required ? "Required" : "Optional"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={PRODUCT_IMPORT_EXCEL_TEMPLATE_PATH}
              download
              className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-sm text-ink hover:border-accent hover:bg-accent hover:text-white"
            >
              Download Excel sheet
            </a>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(IMPORT_TEMPLATE_FILENAME, buildImportTemplate())}>
              Download CSV template
            </Button>
          </div>
        </Step>

        <Step number={2} title="Choose what to do and upload the file">
          {!access.create ? (
            <p className="rounded-xl border border-line bg-surface-2 px-6 py-8 text-sm text-ink-secondary">
              Your role can view this page but can&apos;t upload files.
            </p>
          ) : (
            <>
              <fieldset className="mb-6 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Import mode</legend>
                {IMPORT_MODES.map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border px-4 py-3",
                      mode === value ? "border-accent bg-surface-2" : "border-line",
                    )}
                  >
                    <input
                      type="radio"
                      name="import-mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => changeMode(value)}
                      disabled={busy || run.phase === "done"}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">{IMPORT_MODE_LABELS[value]}</span>
                      <span className="mt-1 block text-xs text-ink-secondary">{IMPORT_MODE_HINTS[value]}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {file ? (
                <SelectedFile
                  file={file}
                  checking={validate.isPending}
                  locked={busy}
                  onReplace={handleFile}
                  onRemove={clear}
                />
              ) : (
                <ImportDropZone onFile={handleFile} />
              )}
            </>
          )}

          {fileError && (
            <p role="alert" className="mt-4 rounded-xl border border-danger px-4 py-3 text-sm text-danger">
              {fileError}
            </p>
          )}
          {validate.isError && (
            <p role="alert" className="mt-4 rounded-xl border border-danger px-4 py-3 text-sm text-danger">
              {validate.error.message}
              {parsed && (
                <Button variant="outline" size="sm" className="ml-3" onClick={() => check(parsed, mode)}>
                  Try again
                </Button>
              )}
            </p>
          )}
        </Step>

        {preview && (
          <Step number={3} title="Review the preview">
            <dl className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Figure label="Rows" value={preview.totalRows} />
              <Figure label="Products" value={preview.productCount} />
              <Figure label="Ready" value={preview.validRows} tone="live" />
              <Figure label="Need fixing" value={preview.invalidRows} tone={preview.invalidRows > 0 ? "danger" : undefined} />
              <Figure label="Skipped" value={preview.skippedRows} />
            </dl>

            {parsed && parsed.notices.length > 0 && (
              <ul
                aria-label="Columns not imported"
                className="mb-5 space-y-1 rounded-xl border border-line bg-surface-2 px-5 py-4 text-sm text-ink-secondary"
              >
                {parsed.notices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            )}

            <ImportPreviewTable key={`${file?.name}-${preview.mode}`} preview={preview} />

            <ImportPanel
              preview={preview}
              run={run}
              onImport={() => startImport()}
              onResume={(record) => startImport(record)}
              onDownloadErrors={(id) => downloadErrors.mutate(id)}
              downloading={downloadErrors.isPending}
              onAnother={clear}
            />
          </Step>
        )}
      </div>
    </AdminPage>
  );
}

function ImportPanel({
  preview,
  run,
  onImport,
  onResume,
  onDownloadErrors,
  downloading,
  onAnother,
}: {
  preview: ImportPreview;
  run: Run;
  onImport: () => void;
  onResume: (record: ProductImportItem) => void;
  onDownloadErrors: (id: string) => void;
  downloading: boolean;
  onAnother: () => void;
}) {
  const record = run.phase === "running" || run.phase === "done" || run.phase === "stopped" ? run.record : null;
  const handled = record ? record.importedRows + record.failedRows + record.skippedRows : 0;
  const updateBlocked = preview.mode === "UPDATE_EXISTING" && preview.invalidRows > 0;

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface-2 px-5 py-4" aria-live="polite">
      {run.phase === "idle" && (
        <>
          {preview.invalidRows > 0 && (
            <p className="text-sm text-danger">
              {preview.invalidRows} {preview.invalidRows === 1 ? "row needs" : "rows need"} fixing.{" "}
              {updateBlocked
                ? "An update only runs when every row is valid. Fix the file and upload it again."
                : "Those rows won't be imported, and they'll be listed in the report afterwards."}
            </p>
          )}
          {preview.skippedRows > 0 && (
            <p className="text-sm text-ink-secondary">
              {preview.skippedRows} {preview.skippedRows === 1 ? "row is" : "rows are"} already in the catalogue and will
              be skipped.
            </p>
          )}
          {preview.validRows > 0 && !updateBlocked && (
            <p className="text-sm text-ink-secondary">
              {preview.mode === "CREATE_NEW"
                ? "Importing adds the ready products to the catalogue."
                : "Importing changes the ready variants shown above."}
            </p>
          )}
          <Button size="sm" className="mt-4" disabled={preview.validRows === 0 || updateBlocked} onClick={onImport}>
            Import {preview.validRows} rows
          </Button>
        </>
      )}

      {run.phase === "saving" && (
        <p className="flex items-center gap-2 text-sm text-ink-secondary">
          <Spinner /> Saving the file
        </p>
      )}

      {record && (
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-ink">{run.phase === "done" ? IMPORT_STATUS_LABELS[record.status] : "Importing"}</span>
            <span className="font-mono text-xs tabular-nums text-ink-secondary">
              {handled} / {record.totalRows}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={record.totalRows}
            aria-valuenow={handled}
            className="h-2 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full bg-live transition-[width]" style={{ width: `${Math.round((handled / record.totalRows) * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm text-ink-secondary">
            <span className="text-live">{record.importedRows} imported</span>
            <span className={cn(record.failedRows > 0 && "text-danger")}>, {record.failedRows} failed</span>
            <span>, {record.skippedRows} skipped</span>
          </p>
        </div>
      )}

      {run.phase === "done" && run.record.failedRows > 0 && (
        <div className="mt-5">
          <h3 className="mb-3 text-sm font-medium text-ink">Rows that were not imported</h3>
          <ImportRowsList importId={run.record.id} status="FAILED" />
        </div>
      )}

      {run.phase === "stopped" && (
        <div className="mt-4">
          <p role="alert" className="text-sm text-danger">
            {run.message}
          </p>
          <div className="mt-3 flex gap-2">
            {run.record && (
              <Button size="sm" onClick={() => onResume(run.record!)}>
                Resume import
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onAnother}>
              Start over
            </Button>
          </div>
        </div>
      )}

      {run.phase === "done" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {run.record.failedRows > 0 && (
            <Button size="sm" variant="outline" disabled={downloading} onClick={() => onDownloadErrors(run.record.id)}>
              Download error report
            </Button>
          )}
          <Link
            href={ADMIN_PRODUCT_IMPORT_HISTORY_PATH}
            className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-sm text-ink hover:border-accent hover:bg-accent hover:text-white"
          >
            View import history
          </Link>
          <Button size="sm" variant="ghost" onClick={onAnother}>
            Upload another file
          </Button>
        </div>
      )}
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`import-step-${number}`}>
      <h2 id={`import-step-${number}`} className="mb-4 text-base font-medium text-ink">
        <span className="mr-2 font-mono text-xs text-ink-muted">{number}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Figure({ label, value, tone }: { label: string; value: number; tone?: "live" | "danger" }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={cn("mt-1 text-2xl font-light tabular-nums", tone === "live" && "text-live", tone === "danger" && "text-danger")}>
        {value}
      </dd>
    </div>
  );
}

function SelectedFile({
  file,
  checking,
  locked,
  onReplace,
  onRemove,
}: {
  file: PickedFile;
  checking: boolean;
  locked: boolean;
  onReplace: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line px-5 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{file.name}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-ink-secondary" aria-live="polite">
          {formatBytes(file.size)}
          {checking && (
            <>
              <Spinner /> Checking the rows
            </>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <label className="inline-flex">
          <span className="sr-only">Replace file</span>
          <input
            type="file"
            accept={IMPORT_FILE_ACCEPT}
            className="sr-only peer"
            disabled={locked}
            onChange={(event) => {
              const next = event.target.files?.[0];
              event.target.value = "";
              if (next) onReplace(next);
            }}
          />
          <span
            aria-hidden
            className="inline-flex h-9 cursor-pointer items-center rounded-full border border-line-strong px-4 text-sm text-ink peer-focus-visible:outline peer-focus-visible:outline-2 hover:border-accent hover:bg-accent hover:text-white"
          >
            Replace
          </span>
        </label>
        <Button variant="ghost" size="sm" disabled={locked} onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}
