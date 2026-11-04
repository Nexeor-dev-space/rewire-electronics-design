"use client";

import { useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useValidateProductImport } from "@/hooks/use-product-import";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { downloadCsv } from "@/lib/csv";
import { formatBytes } from "@/lib/media";
import {
  IMPORT_COLUMNS,
  IMPORT_MODES,
  IMPORT_MODE_HINTS,
  IMPORT_MODE_LABELS,
  IMPORT_TEMPLATE_FILENAME,
  ImportFileError,
  buildImportTemplate,
  checkImportFile,
  importColumnHeader,
  missingColumns,
  parseImportFile,
  type ImportMode,
  type ParsedImportFile,
} from "@/lib/product-import";
import { cn } from "@/lib/utils";
import { ImportDropZone } from "./import-drop-zone";
import { ImportPreviewTable } from "./import-preview-table";

interface PickedFile {
  name: string;
  size: number;
}

export function ProductImportScreen() {
  const access = useModuleAccess(PERMISSIONS.bulkUpload);
  const validate = useValidateProductImport();
  const [mode, setMode] = useState<ImportMode>("CREATE_NEW");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function check(next: ParsedImportFile, nextMode: ImportMode) {
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
      const result = parseImportFile(await next.text());
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

  const preview = validate.data;

  return (
    <AdminPage
      title="Bulk Product Upload"
      description="Create or update products and their variants from a CSV file. Every row is checked before anything is saved."
    >
      <div className="space-y-10">
        <Step number={1} title="Download the template">
          <p className="text-sm text-ink-secondary">
            One row is one variant. Rows with the same product_slug make up one product.
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
          <Button
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => downloadCsv(IMPORT_TEMPLATE_FILENAME, buildImportTemplate())}
          >
            Download template
          </Button>
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
            <dl className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Figure label="Rows" value={preview.totalRows} />
              <Figure label="Products" value={preview.productCount} />
              <Figure label="Ready" value={preview.validRows} tone="live" />
              <Figure label="Need fixing" value={preview.invalidRows} tone={preview.invalidRows > 0 ? "danger" : undefined} />
            </dl>

            <ImportPreviewTable key={`${file?.name}-${preview.mode}`} preview={preview} />

            <div className="mt-6 rounded-xl border border-line bg-surface-2 px-5 py-4">
              {preview.invalidRows > 0 ? (
                <p className="text-sm text-danger">
                  Fix the rows marked Needs fixing in your CSV, then upload it again. A file can only be imported when
                  every row is valid.
                </p>
              ) : (
                <p className="text-sm text-ink-secondary">
                  Every row is valid. Importing, progress and import history arrive in the next update, so nothing has
                  been saved.
                </p>
              )}
              <Button size="sm" className="mt-4" disabled>
                Import {preview.validRows} rows
              </Button>
            </div>
          </Step>
        )}
      </div>
    </AdminPage>
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
  onReplace,
  onRemove,
}: {
  file: PickedFile;
  checking: boolean;
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
            accept=".csv,text/csv"
            className="sr-only peer"
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
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}
