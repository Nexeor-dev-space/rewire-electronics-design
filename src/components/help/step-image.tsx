"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A step's screenshot, linked to the full size file so it can be zoomed on a
 * small screen. A file that fails to load is hidden, so a guide reads fine
 * before its screenshots exist.
 */
export function StepImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="mt-3 block w-full max-w-4xl">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={750}
        unoptimized
        onError={() => setFailed(true)}
        className="h-auto w-full rounded-lg border border-line"
      />
      <span className="mt-1 block text-xs text-ink-muted sm:sr-only">Tap the screenshot to see it full size</span>
    </a>
  );
}
