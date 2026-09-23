"use client";

import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { conditions, grades, priceBands } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import type { NamedCount, ShopFacets, ShopFilterState } from "@/types/catalogue";

export type FilterAxis = Exclude<keyof ShopFilterState, "q" | "sort">;

/**
 * Opens on its own height and closes faster than it opens — the same
 * asymmetry the FAQ accordion uses, so every disclosure on the site
 * moves the same way.
 */
const panel: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: DURATION.base, ease: EASE_OUT_EXPO },
      opacity: { duration: 0.18 },
    },
  },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.52, ease: EASE_OUT_EXPO },
      opacity: { duration: 0.3, delay: 0.05 },
    },
  },
};

interface Option {
  value: string;
  label: string;
  note?: string;
  nested?: boolean;
}

interface Group {
  axis: FilterAxis;
  title: string;
  note?: string;
  options: Option[];
  counts: Partial<Record<string, number>> | null;
  openByDefault: boolean;
}

const countsOf = (list: NamedCount[]) =>
  Object.fromEntries(list.map((entry) => [entry.value, entry.count]));

function withSelected(values: string[], selected: string[]): Option[] {
  return [...new Set([...values, ...selected])].map((value) => ({ value, label: value }));
}

function categoryOptions(facets: ShopFacets | undefined, selected: string[]): Option[] {
  const categories = facets?.categories ?? [];
  const options = categories
    .filter((category) => category.parentSlug === null)
    .flatMap((parent) => [
      { value: parent.slug, label: parent.name },
      ...categories
        .filter((child) => child.parentSlug === parent.slug)
        .map((child) => ({ value: child.slug, label: child.name, nested: true })),
    ]);
  const missing = selected.filter((slug) => !options.some((option) => option.value === slug));
  return [...options, ...missing.map((slug) => ({ value: slug, label: slug }))];
}

function buildGroups(facets: ShopFacets | undefined, filters: ShopFilterState): Group[] {
  return [
    {
      axis: "category",
      title: "Category",
      note: "What the product is",
      options: categoryOptions(facets, filters.category),
      counts: facets
        ? Object.fromEntries(facets.categories.map((category) => [category.slug, category.count]))
        : null,
      openByDefault: true,
    },
    {
      axis: "condition",
      title: "Condition",
      note: "How it is being sold",
      options: conditions.map((condition) => ({
        value: condition.value,
        label: condition.label,
        note: condition.note,
      })),
      counts: facets?.conditions ?? null,
      openByDefault: true,
    },
    {
      axis: "grade",
      title: "Grade",
      note: "What state it is in — refurbished and pre-owned only",
      options: grades.map((grade) => ({
        value: grade.value,
        label: grade.label,
        note: grade.note,
      })),
      counts: facets?.grades ?? null,
      openByDefault: true,
    },
    {
      axis: "price",
      title: "Price",
      options: priceBands.map((band) => ({ value: band.id, label: band.label })),
      counts: facets?.priceBands ?? null,
      openByDefault: true,
    },
    {
      axis: "brand",
      title: "Brand",
      options: withSelected(facets?.brands.map((brand) => brand.value) ?? [], filters.brand),
      counts: facets ? countsOf(facets.brands) : null,
      openByDefault: false,
    },
    {
      axis: "storage",
      title: "Storage",
      options: withSelected(facets?.storage.map((size) => size.value) ?? [], filters.storage),
      counts: facets ? countsOf(facets.storage) : null,
      openByDefault: false,
    },
  ];
}

export interface FilterPanelProps {
  filters: ShopFilterState;
  facets: ShopFacets | undefined;
  onToggle: (axis: FilterAxis, value: string) => void;
  idPrefix: string;
  className?: string;
}

export function FilterPanel({
  filters,
  facets,
  onToggle,
  idPrefix,
  className,
}: FilterPanelProps) {
  const groups = buildGroups(facets, filters);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group) => [group.axis, group.openByDefault])),
  );

  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {groups.map((group) => {
        const selected: string[] = filters[group.axis];
        const isOpen = open[group.axis];
        const panelId = `${idPrefix}-${group.axis}`;

        return (
          <section key={group.axis} className="py-1">
            <h3>
              <button
                type="button"
                onClick={() =>
                  setOpen((current) => ({
                    ...current,
                    [group.axis]: !current[group.axis],
                  }))
                }
                aria-expanded={isOpen}
                aria-controls={panelId}
                className={cn(
                  "flex w-full items-center gap-3 py-4 text-left",
                  "transition-colors duration-(--duration-fast)",
                  "hover:text-ink",
                )}
              >
                <span className="flex-1">
                  <span className="eyebrow block text-ink">{group.title}</span>
                  {group.note && (
                    <span className="mt-1.5 block text-[0.8125rem] leading-snug text-ink-muted">
                      {group.note}
                    </span>
                  )}
                </span>

                {selected.length > 0 && (
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full",
                      "bg-ink font-mono text-[0.625rem] leading-none tabular-nums text-surface",
                    )}
                  >
                    {selected.length}
                  </span>
                )}

                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "size-3.5 shrink-0 text-ink-muted",
                    "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                    isOpen && "rotate-180",
                  )}
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  variants={panel}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="overflow-hidden"
                >
                  <ul className="pb-4">
                    {group.options.map((option) => {
                      const checked = selected.includes(option.value);
                      const count = group.counts ? (group.counts[option.value] ?? 0) : null;
                      // A zero-count option is disabled rather than removed:
                      // rows that appear and vanish as boxes are ticked make
                      // a panel feel broken even while it behaves correctly.
                      const disabled = count === 0 && !checked;

                      return (
                        <li key={option.value}>
                          <label
                            className={cn(
                              "group/row flex cursor-pointer items-start gap-3 py-2",
                              option.nested && "pl-7.5",
                              disabled && "cursor-not-allowed opacity-40",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => onToggle(group.axis, option.value)}
                            />
                            <span
                              aria-hidden
                              className={cn(
                                "mt-0.5 flex size-[1.125rem] shrink-0 items-center justify-center rounded-xs border",
                                "transition-[background-color,border-color] duration-(--duration-fast)",
                                checked
                                  ? "border-ink bg-ink"
                                  : "border-line-strong bg-surface group-hover/row:border-ink-muted",
                                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                              )}
                            >
                              {checked && (
                                <svg
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="size-2.5 text-surface"
                                >
                                  <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                                </svg>
                              )}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block text-sm leading-snug transition-colors duration-(--duration-fast)",
                                  checked ? "text-ink" : "text-ink-secondary group-hover/row:text-ink",
                                )}
                              >
                                {option.label}
                              </span>
                              {option.note && (
                                <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                                  {option.note}
                                </span>
                              )}
                            </span>

                            <span className="mt-0.5 shrink-0 font-mono text-[0.6875rem] tabular-nums text-ink-faint">
                              {count}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
