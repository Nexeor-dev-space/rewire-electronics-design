"use client";

import Image from "next/image";
import Link from "next/link";
import { supportContact, type MenuLink } from "@/lib/navigation";
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
 * MenuSupportBox — "Need help?" as a panel-sized card: email, live chat
 * with its pulsing status dot, and the hours behind both.
 *
 * This is the box the Support mega-panel used to carry on its
 * right-hand side. Support merged into About, so it moved here — into
 * the shared primitives — rather than being rewritten inside
 * `AboutMenu`. It replaces the "Built to be kept." editorial plate that
 * sat in that slot, which was a photograph and a link to the page the
 * trigger already pointed at; a reader who has opened the company menu
 * is far more often looking for a way to reach a person.
 *
 * Every value is read from `supportContact` in `lib/support.ts`, so
 * this box, the support page's own contact section and the footer all
 * quote the same address and the same hours.
 */
export function MenuSupportBox({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-void p-8", className)}>
      <p className="text-[1.25rem] font-light tracking-[-0.02em] text-ink">
        {supportContact.heading}
      </p>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Email
          </dt>
          <dd className="mt-1.5">
            {/* `mailto:` must not be routed through next/link. */}
            <a
              href={`mailto:${supportContact.email}`}
              className="text-[0.9375rem] text-ink transition-colors duration-(--duration-fast) hover:text-accent"
            >
              {supportContact.email}
            </a>
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Chat
          </dt>
          <dd className="mt-1.5">
            <Link
              href={supportContact.chat.href}
              className="inline-flex items-center gap-2 text-[0.9375rem] text-ink transition-colors duration-(--duration-fast) hover:text-accent"
            >
              <span
                aria-hidden
                className="size-1.5 animate-pulse-dot rounded-full bg-live"
              />
              {supportContact.chat.label}
            </Link>
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Hours
          </dt>
          <dd className="mt-1.5 space-y-1">
            {supportContact.hours.map((line) => (
              <span
                key={line}
                className="block text-[0.875rem] text-ink-secondary"
              >
                {line}
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </div>
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
