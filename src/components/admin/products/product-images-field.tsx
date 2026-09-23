"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { useUploadImage } from "@/hooks/use-upload";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES, formatBytes, isImageMimeType } from "@/lib/media";
import { MAX_IMAGES } from "@/validators/product.validator";

export interface DraftImage {
  mediaId: string;
  url: string;
  alt: string;
}

export function ProductImagesField({
  images,
  onChange,
  error,
}: {
  images: DraftImage[];
  onChange: (next: DraftImage[]) => void;
  error?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const upload = useUploadImage();

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    const room = MAX_IMAGES - images.length;
    const accepted = files.filter(
      (file) => isImageMimeType(file.type) && file.size <= MAX_IMAGE_BYTES,
    );
    setRejected(
      accepted.length < files.length
        ? `Some files were skipped. Use images up to ${formatBytes(MAX_IMAGE_BYTES)}.`
        : files.length > room
          ? `Only ${MAX_IMAGES} images fit. The extra files were skipped.`
          : null,
    );

    let next = images;
    for (const file of accepted.slice(0, room)) {
      const uploaded = await upload.mutateAsync(file).catch(() => null);
      if (!uploaded) break;
      next = [...next, { mediaId: uploaded.id, url: uploaded.url, alt: "" }];
      onChange(next);
    }
  }

  function update(index: number, patch: Partial<DraftImage>) {
    onChange(images.map((image, i) => (i === index ? { ...image, ...patch } : image)));
  }

  function makeCover(index: number) {
    onChange([images[index], ...images.filter((_, i) => i !== index)]);
  }

  const message = rejected ?? (upload.isError ? upload.error.message : error);

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={id}>Images</Label>

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.mediaId} className="rounded-lg border border-line bg-surface p-2">
              <div className="relative aspect-square overflow-hidden rounded-md bg-surface-2">
                <Image src={image.url} alt="" fill sizes="160px" className="object-contain p-2" unoptimized />
                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1.5 py-0.5 text-[0.625rem] text-white">
                    Cover
                  </span>
                )}
              </div>
              <Input
                value={image.alt}
                onChange={(event) => update(index, { alt: event.target.value })}
                placeholder="Alt text"
                aria-label={`Alt text for image ${index + 1}`}
                className="mt-2 h-9 px-2 text-xs"
              />
              <div className="mt-2 flex gap-1">
                {index > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => makeCover(index)}>
                    Make cover
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={IMAGE_ACCEPT}
        onChange={handleFiles}
        className="sr-only"
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={upload.isPending}
          disabled={images.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          Upload images
        </Button>
        <p className="text-xs text-ink-muted">
          {upload.isPending
            ? `Uploading… ${upload.progress}%`
            : `${images.length} / ${MAX_IMAGES} · the first image is the cover`}
        </p>
      </div>

      <FieldError>{message}</FieldError>
    </div>
  );
}
