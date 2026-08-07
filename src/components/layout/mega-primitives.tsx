"use client";

import Image from "next/image";
import Link from "next/link";
import type { MenuLink } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/* ============================================================
   Shared primitives — every panel is built from these
   ============================================================ */

/** Mono label that opens a column. */
export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
      {children}
    </p>
  );
}

/** A plain link in a column list. The hover ground is the whole row. */
export function MenuItem({ item }: { item: MenuLink }) {
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "group/item -mx-3 block rounded-lg px-3 py-2.5",
          "transition-colors duration-(--duration-fast)",
          "hover:bg-surface-2",
        )}
      >
        <span className="block text-[0.9375rem] text-ink-secondary transition-colors duration-(--duration-fast) group-hover/item:text-ink">
          {item.label}
        </span>
        {item.note && (
          <span className="mt-0.5 block text-[0.8125rem] text-ink-muted">
            {item.note}
          </span>
        )}
      </Link>
    </li>
  );
}

/** The arrow that closes a call to action. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-3.5", className)}
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/** Text CTA whose arrow travels on hover. */
export function MenuCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/cta inline-flex items-center gap-2.5 text-[0.9375rem] font-medium text-ink",
        "transition-colors duration-(--duration-fast) hover:text-accent",
        className,
      )}
    >
      {children}
      <Arrow className="transition-transform duration-(--duration-fast) ease-(--ease-out-quart) group-hover/cta:translate-x-1" />
    </Link>
  );
}

/**
 * A photographic plate. The image scales inside a clipped frame so the
 * card itself never grows and nudges the layout.
 */
export function MenuImage({
  src,
  alt,
  priority,
  className,
  sizes = "(max-width: 1280px) 30vw, 22vw",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <span className={cn("relative block overflow-hidden bg-surface-2", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-hover/card:scale-[1.03]"
      />
    </span>
  );
}
