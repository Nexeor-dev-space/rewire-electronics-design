"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ShopFilters } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { FilterPanel } from "./filter-panel";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: ShopFilters;
  onToggle: (axis: keyof ShopFilters, value: string) => void;
  onClear: () => void;
  /** Live result count — the confirm button reports what it will show. */
  resultCount: number;
  activeCount: number;
}

/**
 * FilterDrawer — the sidebar, on screens that have no room for one.
 *
 * A panel from the right rather than a full-bleed takeover, matching the
 * navigation drawer exactly: same z-layer, same AnimatePresence shape,
 * same focus trap, same scroll lock, same escape handling. Below `lg`
 * this is the only way to reach the filters, so it carries the whole
 * panel rather than an abridged set — a shopper narrowing a catalogue of
 * thirty-two devices on a phone needs grade and storage exactly as much
 * as one on a desktop does.
 *
 * The foot is pinned to the panel so "Show N results" stays reachable
 * without scrolling back down a long list of checkboxes.
 */
export function FilterDrawer({
  open,
  onClose,
  filters,
  onToggle,
  onClear,
  resultCount,
  activeCount,
}: FilterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 60);

    return () => {
      window.clearTimeout(id);
      document.documentElement.style.overflow = "";
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="filter-drawer"
          className="fixed inset-0 z-90 lg:hidden"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter products"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className={cn(
              "absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col",
              "border-l border-line bg-void shadow-(--shadow-float)",
            )}
          >
            {/* ---------- Head ---------- */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-(--spacing-gutter) py-5">
              <p className="text-[1.125rem] font-medium tracking-[-0.02em] text-ink">
                Filters
                {activeCount > 0 && (
                  <span className="ml-2 font-mono text-[0.75rem] tabular-nums text-ink-muted">
                    {activeCount}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className={cn(
                  "-mr-2 flex size-10 items-center justify-center rounded-full",
                  "text-ink-secondary transition-colors duration-(--duration-fast)",
                  "hover:bg-ink/5 hover:text-ink",
                )}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="size-5"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* ---------- Body ----------
                `data-lenis-prevent` keeps wheel + touch scroll inside
                this pane rather than handing it to the page's Lenis
                driver behind the drawer. */}
            <div
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--spacing-gutter) pb-8"
            >
              <FilterPanel
                idPrefix="drawer"
                filters={filters}
                onToggle={onToggle}
                className="border-t-0"
              />
            </div>

            {/* ---------- Foot ---------- */}
            <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-(--spacing-gutter) py-4">
              <Button
                variant="ghost"
                size="md"
                onClick={onClear}
                disabled={activeCount === 0}
                className="shrink-0"
              >
                Clear all
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={onClose}
                className="flex-1"
              >
                Show {resultCount} {resultCount === 1 ? "result" : "results"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
