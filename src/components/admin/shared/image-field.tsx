"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/label";
import { useUploadImage } from "@/hooks/use-upload";
import {
  IMAGE_ACCEPT,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  formatBytes,
  isImageMimeType,
} from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * The image control shared by the category and brand modals.
 *
 * Uploads as soon as a file is chosen rather than at save, which is what
 * makes a real progress figure possible and keeps one upload endpoint for
 * both modules. An image uploaded into a modal that is then cancelled is
 * collected by the orphan sweep — see `media.service.ts`.
 */

const EXTENSIONS = IMAGE_MIME_TYPES.map((mime) => mime.replace("image/", "").toUpperCase()).join(
  ", ",
);

interface ImageFieldProps {
  label: string;
  /** The stored asset id, submitted with the form. */
  value: string | null;
  /** Where to show it from. Null when there is no image. */
  previewUrl: string | null;
  onChange: (imageId: string | null, previewUrl: string | null) => void;
  /** A server-side error for this field. */
  error?: string;
}

export function ImageField({ label, value, previewUrl, onChange, error }: ImageFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const upload = useUploadImage();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clearing the input lets the same file be picked again after a failure.
    event.target.value = "";
    if (!file) return;

    // Checked here so an obviously wrong file never leaves the browser. The
    // route checks again — that is the check that counts.
    if (!isImageMimeType(file.type)) {
      setRejected(`That file isn't an image we accept. Use ${EXTENSIONS}.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setRejected(
        `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`,
      );
      return;
    }

    setRejected(null);
    upload.mutate(file, { onSuccess: (image) => onChange(image.id, image.url) });
  }

  function handleRemove() {
    setRejected(null);
    upload.reset();
    onChange(null, null);
  }

  const message = rejected ?? (upload.isError ? upload.error.message : error);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "relative size-24 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2",
            upload.isPending && "opacity-60",
          )}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt=""
              fill
              sizes="96px"
              className="object-contain p-2"
              unoptimized
            />
          ) : (
            <span className="grid size-full place-items-center text-xs text-ink-muted">
              No image
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={handleChange}
            className="sr-only"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {value ? "Replace image" : "Upload image"}
            </Button>

            {value && !upload.isPending && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                Remove
              </Button>
            )}
          </div>

          {upload.isPending ? (
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuenow={upload.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1 w-40 overflow-hidden rounded-full bg-surface-3"
            >
              <div
                className="h-full bg-accent transition-[width] duration-(--duration-fast)"
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          ) : (
            <p className="text-xs text-ink-muted">
              {EXTENSIONS} · up to {formatBytes(MAX_IMAGE_BYTES)}
            </p>
          )}
        </div>
      </div>

      <FieldError>{message}</FieldError>
    </div>
  );
}
