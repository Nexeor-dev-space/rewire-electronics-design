"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { searchSuggestions } from "@/lib/site";
import { DURATION, EASE_OUT_EXPO, overlayFade } from "@/lib/motion";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * SearchOverlay — the whole viewport, one field, nothing else.
 *
 * Focus moves to the input on open and returns to the trigger on close,
 * Escape dismisses, and the page behind is locked. The suggestions are
 * real buttons rather than decorative chips, so the overlay is usable
 * without ever typing.
 */
export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);

    return () => {
      window.clearTimeout(id);
      document.documentElement.style.overflow = "";
      restoreFocusRef.current?.focus();
      setQuery("");
    };
  }, [open]);

  function submit(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search"
          role="dialog"
          aria-modal="true"
          aria-label="Search devices"
          onKeyDown={handleKeyDown}
          variants={overlayFade}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-100 bg-void/97 backdrop-blur-2xl"
        >
          <div aria-hidden className="grain absolute inset-0" />

          {/* Close — first in the tab order, so Escape is never the only exit */}
          <div className="relative mx-auto flex h-16 max-w-[110rem] items-center justify-end px-(--spacing-gutter) md:h-20">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-ink/5 hover:text-ink"
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="size-4"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className="relative mx-auto w-full max-w-3xl px-(--spacing-gutter) pt-[12vh]"
          >
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                submit(query);
              }}
            >
              <label htmlFor="site-search" className="sr-only">
                Search devices
              </label>
              <div className="flex items-center gap-4 border-b border-line-strong pb-5">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
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
                  placeholder="Search devices..."
                  autoComplete="off"
                  className="w-full bg-transparent text-[clamp(1.5rem,4vw,2.25rem)] tracking-[-0.02em] text-ink placeholder:text-ink-faint focus:outline-none"
                />
              </div>
            </form>

            <div className="mt-10">
              <p
                id="search-suggestions-label"
                className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-muted"
              >
                Quick suggestions
              </p>
              <ul
                aria-labelledby="search-suggestions-label"
                className="mt-5 flex flex-wrap gap-2.5"
              >
                {searchSuggestions.map((suggestion, i) => (
                  <motion.li
                    key={suggestion}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: DURATION.base,
                      ease: EASE_OUT_EXPO,
                      delay: 0.1 + i * 0.05,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => submit(suggestion)}
                      className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-secondary transition-colors duration-(--duration-fast) hover:border-line-strong hover:text-ink"
                    >
                      {suggestion}
                    </button>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
