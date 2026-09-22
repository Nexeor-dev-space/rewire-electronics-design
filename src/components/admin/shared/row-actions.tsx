"use client";

import Image from "next/image";

/**
 * The pieces every catalogue table row shares: the image cell, and the
 * edit/delete pair. Kept here rather than in either module so neither has to
 * import the other's internals.
 */

export function Thumbnail({ url }: { url: string | null }) {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
      {/* `unoptimized`: these come from /api/v1/media, already sized for a
          36px cell, and running them through the optimiser buys nothing. */}
      {url && (
        <Image src={url} alt="" fill sizes="36px" className="object-contain p-1" unoptimized />
      )}
    </div>
  );
}

export function RowActions({
  name,
  disabled,
  onEdit,
  onDelete,
}: {
  /** Named in each control's accessible label, so the row is unambiguous. */
  name: string;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-2 flex gap-1.5 lg:mt-0 lg:justify-end">
      <IconButton label={`Edit ${name}`} onClick={onEdit} disabled={disabled}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </IconButton>
      <IconButton label={`Delete ${name}`} onClick={onDelete} disabled={disabled}>
        <path d="M4 7h16" />
        <path d="M9 7V4.5h6V7" />
        <path d="M6.5 7l1 12.5h9l1-12.5" />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-md border border-line p-1.5 text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-ink disabled:opacity-40"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}
