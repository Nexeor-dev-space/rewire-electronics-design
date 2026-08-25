"use client";

import Image from "next/image";
import { useState } from "react";
import type { Media } from "@/types";
import { cn } from "@/lib/utils";

/**
 * ProductGallery — the visual half of the buy page.
 *
 * One large stage on top, thumbnails below on desktop and to the left on
 * larger widths. The stage respects `Media.fit`: transparent cutouts float
 * inside a padded plate, while lifestyle plates fill it. On mobile the
 * thumbnails become a horizontal rail that scrolls independently.
 */
export function ProductGallery({ images }: { images: Media[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  if (!active) return null;

  return (
    <div className="lg:sticky lg:top-28 flex flex-col-reverse gap-4 lg:flex-row">
      {/* Thumbnails */}
      {images.length > 1 && (
        <ul
          aria-label="Product thumbnails"
          data-lenis-prevent
          className={cn(
            "no-scrollbar flex gap-3 overflow-x-auto",
            "lg:flex-col lg:overflow-y-auto lg:pb-0",
          )}
        >
          {images.map((image, i) => {
            const selected = i === activeIndex;
            return (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-pressed={selected}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  className={cn(
                    "relative block size-20 overflow-hidden rounded-lg border bg-surface",
                    "transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out-quart)",
                    selected
                      ? "border-ink shadow-(--shadow-soft)"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    sizes="80px"
                    className={cn(
                      image.fit === "cover"
                        ? "object-cover"
                        : "object-contain p-2",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Stage */}
      <div className="flex-1">
        <div
          className={cn(
            "relative aspect-square overflow-hidden rounded-2xl border border-white/[0.04] bg-plate",
            "sm:aspect-[4/5] lg:aspect-square",
          )}
        >
          <Image
            key={active.id}
            src={active.url}
            alt={active.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className={cn(
              "[mix-blend-mode:multiply] transition-opacity duration-(--duration-base) ease-(--ease-out-expo)",
              active.fit === "cover"
                ? "object-cover"
                : "object-contain p-10 sm:p-16",
            )}
          />
        </div>
      </div>
    </div>
  );
}
