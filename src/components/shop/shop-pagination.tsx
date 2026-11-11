"use client";

import { SHOP_PAGINATION_SIBLINGS } from "@/lib/constants";
import { cn, pageNumbers } from "@/lib/utils";

const CONTROL_CLASS = cn(
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10",
  "font-mono text-[0.75rem] tabular-nums",
  "transition-[background-color,border-color,color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
);

function Arrow({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path d={direction === "previous" ? "M10 4l-4 4 4 4" : "M6 4l4 4-4 4"} />
    </svg>
  );
}

function PageList({
  page,
  pageCount,
  siblings,
  onPage,
  className,
}: {
  page: number;
  pageCount: number;
  siblings: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  return (
    <ul className={cn("items-center gap-1 sm:gap-1.5", className)}>
      {pageNumbers(page, pageCount, siblings).map((number, index) =>
        number === null ? (
          <li key={`gap-${index}`} aria-hidden className="px-0.5 font-mono text-[0.75rem] text-ink-muted">
            …
          </li>
        ) : (
          <li key={number}>
            <button
              type="button"
              onClick={() => onPage(number)}
              aria-current={number === page ? "page" : undefined}
              aria-label={`Page ${number}`}
              className={cn(
                CONTROL_CLASS,
                number === page
                  ? "bg-ink text-void"
                  : "text-ink-secondary hover:bg-ink/5 hover:text-ink",
              )}
            >
              {number}
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

/**
 * ShopPagination — Previous, page numbers, Next under the shop grid.
 *
 * Phones show only the first, current and last page (with gaps between) so
 * the bar fits a 320px screen on one line; wider screens add one page either
 * side of the current one. Both lists are rendered and one is hidden with
 * CSS, so the server and browser always agree on what is shown.
 */
export function ShopPagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={cn(CONTROL_CLASS, "border border-line-strong text-ink hover:border-ink-muted sm:w-auto sm:gap-2 sm:px-4")}
      >
        <Arrow direction="previous" />
        <span className="sr-only font-sans text-[0.8125rem] tracking-tight sm:not-sr-only">Previous</span>
      </button>

      <PageList
        page={page}
        pageCount={pageCount}
        siblings={SHOP_PAGINATION_SIBLINGS.mobile}
        onPage={onPage}
        className="flex sm:hidden"
      />
      <PageList
        page={page}
        pageCount={pageCount}
        siblings={SHOP_PAGINATION_SIBLINGS.desktop}
        onPage={onPage}
        className="hidden sm:flex"
      />

      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
        className={cn(CONTROL_CLASS, "border border-line-strong text-ink hover:border-ink-muted sm:w-auto sm:gap-2 sm:px-4")}
      >
        <span className="sr-only font-sans text-[0.8125rem] tracking-tight sm:not-sr-only">Next</span>
        <Arrow direction="next" />
      </button>
    </nav>
  );
}
