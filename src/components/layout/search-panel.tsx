"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { searchCatalogue } from "@/lib/search";
import { productHrefForCategory, productHrefForDrop } from "@/lib/route-map";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  /** The bar control the panel is anchored to — can be a button icon
   *  or the inline search input. Focus returns here on close; outside
   *  clicks over it are ignored. */
  triggerRef: RefObject<HTMLElement | null>;
  /**
   * Seed value from the inline search field. When the shopper starts
   * typing in the header input, the first keystroke lands in the
   * inline field and this prop lifts it into the overlay so nothing
   * is dropped in the handoff.
   */
  initialQuery?: string;
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
  initialQuery = "",
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const results = useMemo(() => searchCatalogue(query), [query]);

  /* Focus the field on open; hand focus back to the icon on close.
     `initialQuery` seeds the overlay's field so the header's inline
     input can hand off the first keystroke without dropping it. */
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    setQuery(initialQuery);
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      // Position the caret at the end of the seeded value.
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    }, 80);
    return () => {
      window.clearTimeout(id);
      setQuery("");
      trigger?.focus();
    };
  }, [open, triggerRef, initialQuery]);

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
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
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
              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(query);
                }}
              >
                <label htmlFor="site-search" className="sr-only">
                  Search certified devices
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
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search certified devices..."
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
                      onClick={() => {
                        setQuery("");
                        inputRef.current?.focus();
                      }}
                      className="shrink-0 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-muted transition-colors duration-(--duration-fast) hover:text-accent"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>

              {/* ---------- Three columns ---------- */}
              {results.empty ? (
                <p className="py-14 text-sm text-ink-secondary">
                  No matches for{" "}
                  <span className="text-ink">&ldquo;{query.trim()}&rdquo;</span>.
                  Press Enter to search the full catalogue.
                </p>
              ) : (
                <div className="grid gap-10 py-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-12 lg:py-12">
                  {results.terms.length > 0 && (
                    <Column title="Quick Searches">
                      <ul className="space-y-1">
                        {results.terms.map((term) => (
                          <li key={term}>
                            <button
                              type="button"
                              onClick={() => submit(term)}
                              className="-mx-2 block w-full rounded-md px-2 py-2 text-left text-[0.9375rem] text-ink-secondary transition-colors duration-(--duration-fast) hover:text-accent"
                            >
                              {term}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Column>
                  )}

                  {results.categories.length > 0 && (
                    <Column title="Browse Categories">
                      <ul className="space-y-1">
                        {results.categories.map((category) => (
                          <li key={category.slug}>
                            <Link
                              href={productHrefForCategory(category.slug)}
                              onClick={onClose}
                              className="-mx-2 block rounded-md px-2 py-2 text-[0.9375rem] text-ink-secondary transition-colors duration-(--duration-fast) hover:text-accent"
                            >
                              {category.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </Column>
                  )}

                  {results.drops.length > 0 && (
                    <Column title="Recent Drops">
                      <ul className="space-y-1">
                        {results.drops.map((drop) => (
                          <li key={drop.id}>
                            <Link
                              href={productHrefForDrop(drop.slug)}
                              onClick={onClose}
                              className="group/drop -mx-2 flex items-center gap-4 rounded-md px-2 py-2.5 transition-colors duration-(--duration-fast) hover:bg-surface-2"
                            >
                              <span className="relative block size-11 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
                                <Image
                                  src={drop.image.url}
                                  alt=""
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[0.9375rem] text-ink transition-colors duration-(--duration-fast) group-hover/drop:text-accent">
                                  {drop.name}
                                </span>
                                <span className="mt-0.5 block font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-muted">
                                  {drop.edition}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </Column>
                  )}
                </div>
              )}
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
  children: React.ReactNode;
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
