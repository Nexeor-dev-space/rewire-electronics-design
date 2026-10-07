"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchSuggestions } from "@/hooks/use-search";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_QUERY_LENGTH } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { productHrefForCategory, SHOP_INDEX_HREF } from "@/lib/route-map";
import { productHref } from "@/lib/shop";
import { searchCopy, searchHref } from "@/lib/site";
import { cn } from "@/lib/utils";
import { AVAILABILITY_LABELS, availabilityFromStock } from "@/types";
import type { SearchSuggestions } from "@/types/catalogue";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  /** The bar control the panel is anchored to — can be a button icon
   *  or the inline search input. Focus returns here on close; outside
   *  clicks over it are ignored. */
  triggerRef: RefObject<HTMLElement | null>;
  /** The query, owned by the header so its inline field and this panel share it. */
  query: string;
  onQueryChange: (value: string) => void;
  /**
   * Draw the panel's own field. False when the header's inline field is
   * the input (from `md`), so the shopper never sees two search boxes.
   */
  showField: boolean;
}

export const SEARCH_PANEL_ID = "site-search-panel";

/** 250ms, opacity + translateY + a touch of blur. Never scale. */
const PANEL_DURATION = 0.25;

/**
 * SearchPanel — the global search, attached to the navigation.
 *
 * Rendered *inside* the header bar and anchored to its bottom edge, so it
 * is genuinely part of the chrome: it inherits the header's fixed
 * position, travels with it, and shares its hairline rather than floating
 * over the page as a dialog. That is also why it is a disclosure
 * (`aria-expanded` on the trigger) and not `role="dialog"` — focus is not
 * trapped and the page behind stays operable.
 */
export function SearchPanel({
  open,
  onClose,
  triggerRef,
  query,
  onQueryChange,
  showField,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const searching = term.length >= SEARCH_MIN_QUERY_LENGTH;
  const suggestions = useSearchSuggestions(searching ? term : "");

  /* Ask the API only once typing pauses. */
  useEffect(() => {
    const id = window.setTimeout(() => setTerm(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  /* With its own field, focus it on open and hand focus back to the icon
     on close. Without one, focus already sits in the header's field. */
  useEffect(() => {
    if (!open || !showField) return;
    const trigger = triggerRef.current;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(id);
      trigger?.focus();
    };
  }, [open, showField, triggerRef]);

  /* Escape anywhere, and any pointer landing outside panel or trigger. */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, triggerRef]);

  function submit(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    onClose();
    router.push(searchHref(trimmed));
  }

  function clear() {
    onQueryChange("");
    (showField ? inputRef.current : triggerRef.current)?.focus();
  }

  // Nothing shows until a query is typed: the panel is for matches only.
  let results: ReactNode;
  if (query.trim().length < SEARCH_MIN_QUERY_LENGTH) {
    results = null;
  } else if (!searching || suggestions.isPending) {
    results = <SuggestionsSkeleton />;
  } else if (suggestions.isError) {
    results = (
      <p role="alert" className="py-14 text-sm text-ink-secondary">
        Suggestions are unavailable right now. Press Enter to search the full catalogue.
      </p>
    );
  } else if (isEmpty(suggestions.data)) {
    results = (
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-14 text-sm text-ink-secondary">
        <p>
          No results found for <span className="text-ink">&ldquo;{term}&rdquo;</span>. Check the
          spelling, or try a brand or model name.
        </p>
        <button
          type="button"
          onClick={clear}
          className="text-ink underline underline-offset-4 transition-colors duration-(--duration-fast) hover:text-accent"
        >
          Clear search
        </button>
      </div>
    );
  } else {
    results = (
      <Suggestions
        data={suggestions.data}
        term={term}
        busy={suggestions.isPlaceholderData}
        onSelect={onClose}
      />
    );
  }

  // Opacity, translate and a touch of blur — never scale. Reduced motion
  // drops to a plain crossfade.
  const hidden = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -10, filter: "blur(5px)" };
  const shown = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, filter: "blur(0px)" };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* The page reads back a touch so the panel owns the foreground.
              Inside the header's stacking context and behind the bar, so
              the chrome itself is never dimmed. */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: PANEL_DURATION, ease: EASE_OUT_EXPO }}
            className="fixed inset-0 -z-10 bg-ink/[0.07]"
          />

          <motion.div
            ref={panelRef}
            id={SEARCH_PANEL_ID}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ duration: PANEL_DURATION, ease: EASE_OUT_EXPO }}
            data-lenis-prevent
            className={cn(
              "absolute inset-x-0 top-full",
              "border-b border-line bg-void shadow-[0_8px_24px_rgb(0_0_0/0.06)]",
              "max-h-[calc(100svh-4rem)] overflow-y-auto md:max-h-[calc(100svh-5rem)]",
            )}
          >
            <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
              {/* ---------- The field: one line, one divider ---------- */}
              {showField && (
              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(query);
                }}
              >
                <label htmlFor="site-search" className="sr-only">
                  {searchCopy.label}
                </label>
                <div className="flex h-18 items-center gap-4 border-b border-line">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    className="size-6 shrink-0 text-ink-muted"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M16.5 16.5L21 21" />
                  </svg>

                  <input
                    ref={inputRef}
                    id="site-search"
                    type="search"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder={searchCopy.placeholder}
                    autoComplete="off"
                    className={cn(
                      "h-full w-full min-w-0 bg-transparent",
                      "text-[clamp(1.375rem,2.4vw,2.25rem)] tracking-[-0.025em]",
                      "text-ink placeholder:text-ink-faint focus:outline-none",
                      "[&::-webkit-search-cancel-button]:appearance-none",
                    )}
                  />

                  {query && (
                    <button
                      type="button"
                      onClick={clear}
                      className="shrink-0 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-muted transition-colors duration-(--duration-fast) hover:text-accent"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
              )}

              {results}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Column({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-muted">
        {title}
      </h2>
      {children}
    </div>
  );
}

const isEmpty = (data: SearchSuggestions) =>
  !data.products.length && !data.brands.length && !data.categories.length;

const LINK_CLASS =
  "-mx-2 block rounded-md px-2 py-2 text-[0.9375rem] text-ink-secondary transition-colors duration-(--duration-fast) hover:text-accent";

function LinkList({
  items,
  onSelect,
}: {
  items: { key: string; href: string; label: string }[];
  onSelect: () => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.key}>
          <Link href={item.href} onClick={onSelect} className={LINK_CLASS}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Suggestions({
  data,
  term,
  busy,
  onSelect,
}: {
  data: SearchSuggestions;
  term: string;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      aria-busy={busy}
      className={cn(
        "py-10 transition-opacity duration-(--duration-fast) lg:py-12",
        busy && "opacity-60",
      )}
    >
      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
        {data.products.length > 0 && (
          <Column title="Products">
            <ul className="space-y-1">
              {data.products.map((product) => (
                <li key={product.id}>
                  <ProductSuggestion product={product} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </Column>
        )}

        {data.brands.length > 0 && (
          <Column title="Brands">
            <LinkList
              items={data.brands.map((brand) => ({
                key: brand.name,
                href: `${SHOP_INDEX_HREF}?brand=${encodeURIComponent(brand.name)}`,
                label: brand.name,
              }))}
              onSelect={onSelect}
            />
          </Column>
        )}

        {data.categories.length > 0 && (
          <Column title="Categories">
            <LinkList
              items={data.categories.map((category) => ({
                key: category.slug,
                href: productHrefForCategory(category.slug),
                label: category.name,
              }))}
              onSelect={onSelect}
            />
          </Column>
        )}
      </div>

      <Link
        href={searchHref(term)}
        onClick={onSelect}
        className="mt-10 inline-block text-sm text-ink underline underline-offset-4 transition-colors duration-(--duration-fast) hover:text-accent"
      >
        See all results for &ldquo;{term}&rdquo;
      </Link>
    </div>
  );
}

function ProductSuggestion({
  product,
  onSelect,
}: {
  product: SearchSuggestions["products"][number];
  onSelect: () => void;
}) {
  const availability = availabilityFromStock(product.stock);

  return (
    <Link
      href={productHref(product)}
      onClick={onSelect}
      className="group/result -mx-2 flex items-center gap-4 rounded-md px-2 py-2.5 transition-colors duration-(--duration-fast) hover:bg-surface-2"
    >
      <span className="relative block size-11 shrink-0 overflow-hidden rounded-md border border-line bg-plate">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="44px"
            className="object-contain p-1 [mix-blend-mode:multiply]"
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.9375rem] text-ink transition-colors duration-(--duration-fast) group-hover/result:text-accent">
          {product.name}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-muted">
          {product.brand} · {formatMoney(product.price)}
          {availability === "sold-out" && ` · ${AVAILABILITY_LABELS[availability]}`}
        </span>
      </span>
    </Link>
  );
}

function SuggestionsSkeleton() {
  return (
    <div aria-busy className="grid gap-10 py-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-12 lg:py-12">
      {Array.from({ length: 3 }, (_, column) => (
        <div key={column} className="space-y-3">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 3 }, (_, row) => (
            <Skeleton key={row} className="h-9 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
