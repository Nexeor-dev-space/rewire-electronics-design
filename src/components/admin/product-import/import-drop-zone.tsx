"use client";

import { useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { PRODUCT_IMPORT_MAX_BYTES, PRODUCT_IMPORT_MAX_ROWS } from "@/lib/constants";
import { formatBytes } from "@/lib/media";
import { cn } from "@/lib/utils";

interface ImportDropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/** Drag and drop, or Choose file. It only hands the file on; reading it is the screen's job. */
export function ImportDropZone({ onFile, disabled }: ImportDropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
        dragging ? "border-accent bg-surface-3" : "border-line-strong bg-surface-2",
        disabled && "opacity-50",
      )}
    >
      <p className="text-base text-ink">Drop a CSV file here</p>
      <p className="mt-2 text-sm text-ink-secondary">
        .csv only, up to {formatBytes(PRODUCT_IMPORT_MAX_BYTES)} and {PRODUCT_IMPORT_MAX_ROWS} rows.
      </p>
      <Button variant="outline" size="sm" className="mt-5" disabled={disabled} onClick={() => input.current?.click()}>
        Choose file
      </Button>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-label="CSV file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file again after fixing it still fires.
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
