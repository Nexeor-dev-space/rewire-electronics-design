"use client";

import { useState } from "react";
import Image from "next/image";

/** A step's screenshot. A file that fails to load is hidden, so a guide reads fine before its screenshots exist. */
export function StepImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={750}
      unoptimized
      onError={() => setFailed(true)}
      className="mt-3 h-auto w-full max-w-2xl rounded-lg border border-line"
    />
  );
}
