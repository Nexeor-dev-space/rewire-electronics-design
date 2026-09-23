"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useGetShopProducts } from "@/hooks/use-catalogue";
import { SHOP_PAGE_SIZE } from "@/lib/constants";
import { CONDITION_META, GRADE_META, priceBands } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import type { ShopFacets, ShopFilterState, ShopListing } from "@/types/catalogue";
import { FilterDrawer } from "./filter-drawer";
import { FilterPanel, type FilterAxis } from "./filter-panel";
import { ShopProductCard } from "./product-card";
import { SortSelect } from "./sort-select";

const AXES: FilterAxis[] = ["category", "condition", "grade", "price", "brand", "storage"];

export function ShopCatalogue({
  initialFilters,
  initialListing,
}: {
  initialFilters: ShopFilterState;
  initialListing: ShopListing;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const listing = useGetShopProducts(
    filters,
    filters === initialFilters ? initialListing : undefined,
  );

  const pages = listing.data?.pages ?? [];
  const facets = pages[0]?.facets;
  const total = pages[0]?.total ?? 0;
  const shown = pages.flatMap((page) => page.items);
  const activeCount = AXES.reduce((sum, axis) => sum + filters[axis].length, 0);

  function toggle(axis: FilterAxis, value: string) {
    const current: string[] = filters[axis];
    setFilters({
      ...filters,
      [axis]: current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    });
  }

  function clearAll() {
    setFilters({
      ...filters,
      category: [],
      condition: [],
      grade: [],
      price: [],
      brand: [],
      storage: [],
    });
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <div className="lg:flex lg:items-start lg:gap-10 xl:gap-14">
          {/* ---------- Sidebar (lg and up) ----------
              Sticky on the aside itself (not on an inner div). The parent
              is `lg:flex`, so the aside's containing block is the flex row
              — which stretches to the height of the tall product grid on
              the right. If `sticky` lived on an inner div, its containing
              block would be this aside, which collapses to filter-content
              height and unsticks the moment the reader scrolls past.
              With sticky here, the panel stays pinned below the header
              through the whole grid, and only scrolls internally when the
              filter list itself is taller than the remaining viewport. */}
          <aside
            aria-label="Filters"
            // `data-lenis-prevent` hands wheel + touch events inside this
            // element back to the browser. Without it Lenis' virtual
            // scroll intercepts every wheel tick and scrolls the *page*
            // instead of this pane, so the sidebar reads as "scrollable
            // by scrollbar-drag only" — which is exactly the bug it
            // fixes.
            data-lenis-prevent
            className={cn(
              "hidden shrink-0 self-start lg:block lg:w-[16rem] xl:w-[17.5rem]",
              "lg:sticky lg:top-28",
              "lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1",
            )}
          >
            <div className="flex items-baseline justify-between gap-4 pb-5">
              <h2 className="eyebrow text-ink">Filters</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className={cn(
                    "text-[0.8125rem] text-ink-secondary underline underline-offset-4",
                    "transition-colors duration-(--duration-fast) hover:text-ink",
                  )}
                >
                  Clear all
                </button>
              )}
            </div>

            <FilterPanel
              idPrefix="sidebar"
              filters={filters}
              facets={facets}
              onToggle={toggle}
            />
          </aside>

          {/* ---------- Results ---------- */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
              <p className="text-sm text-ink-secondary" aria-live="polite">
                <span className="font-mono tabular-nums text-ink">{total}</span>{" "}
                {total === 1 ? "product" : "products"}
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-haspopup="dialog"
                  className={cn(
                    "inline-flex h-10 items-center gap-2.5 rounded-full px-4 sm:px-5 lg:hidden",
                    "border border-line bg-surface text-[0.8125rem] font-medium tracking-tight text-ink",
                    "transition-colors duration-(--duration-fast) ease-(--ease-out-quart)",
                    "hover:border-line-strong active:scale-[0.97]",
                  )}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="size-3.5"
                  >
                    <path d="M2 4h12M4 8h8M6.5 12h3" />
                  </svg>
                  Filters
                  {activeCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-ink font-mono text-[0.625rem] leading-none tabular-nums text-surface">
                      {activeCount}
                    </span>
                  )}
                </button>

                <SortSelect
                  value={filters.sort}
                  onChange={(sort) => setFilters({ ...filters, sort })}
                  className="w-[13.5rem]"
                />
              </div>
            </div>

            {activeCount > 0 && (
              <ul className="flex flex-wrap items-center gap-2 pt-5">
                {chipsFor(filters, facets).map((chip) => (
                  <li key={`${chip.axis}-${chip.value}`}>
                    <button
                      type="button"
                      onClick={() => toggle(chip.axis, chip.value)}
                      className={cn(
                        "group/chip inline-flex h-8 items-center gap-2 rounded-full pl-3.5 pr-2.5",
                        "border border-line bg-surface-2 text-[0.75rem] tracking-tight text-ink-secondary",
                        "transition-colors duration-(--duration-fast)",
                        "hover:border-line-strong hover:text-ink",
                      )}
                    >
                      <span className="text-ink-muted">{chip.axisLabel}</span>
                      {chip.label}
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className="size-3 text-ink-muted transition-colors group-hover/chip:text-ink"
                      >
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                      <span className="sr-only">Remove filter</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={clearAll}
                    className={cn(
                      "inline-flex h-8 items-center px-2 text-[0.75rem] text-ink-secondary",
                      "underline underline-offset-4 transition-colors duration-(--duration-fast) hover:text-ink",
                    )}
                  >
                    Clear all
                  </button>
                </li>
              </ul>
            )}

            {listing.isError ? (
              <div role="alert" className="flex flex-col items-start gap-5 py-24 lg:py-32">
                <p className="eyebrow">Something went wrong</p>
                <p className="max-w-md text-base leading-relaxed text-ink-secondary">
                  {listing.error.message}
                </p>
                <Button variant="outline" size="md" onClick={() => listing.refetch()}>
                  Try again
                </Button>
              </div>
            ) : shown.length > 0 ? (
              <>
                <ul
                  aria-busy={listing.isPlaceholderData}
                  className={cn(
                    "grid gap-x-4 gap-y-10 pt-8 sm:gap-x-5 sm:gap-y-12 lg:pt-10",
                    "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
                    "transition-opacity duration-(--duration-fast)",
                    listing.isPlaceholderData && "opacity-50",
                  )}
                >
                  {shown.map((product, index) => (
                    <motion.li
                      key={product.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: DURATION.slow,
                        ease: EASE_OUT_EXPO,
                        delay: Math.min(index % SHOP_PAGE_SIZE, 7) * 0.04,
                      }}
                    >
                      <ShopProductCard product={product} priority={index < 4} />
                    </motion.li>
                  ))}
                </ul>

                <div className="flex flex-col items-center gap-5 pt-16 lg:pt-20">
                  <p className="font-mono text-[0.75rem] uppercase tracking-[0.14em] tabular-nums text-ink-muted">
                    Showing {shown.length} of {total}
                  </p>

                  {listing.hasNextPage && (
                    <Button
                      variant="outline"
                      size="lg"
                      loading={listing.isFetchingNextPage}
                      onClick={() => listing.fetchNextPage()}
                    >
                      Load more
                    </Button>
                  )}

                  <span aria-hidden className="mt-2 h-px w-16 bg-line" />
                </div>
              </>
            ) : (
              listing.data && (
                <EmptyState
                  filtered={activeCount > 0}
                  query={filters.q}
                  onClear={clearAll}
                />
              )
            )}
          </div>
        </div>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        facets={facets}
        onToggle={toggle}
        onClear={clearAll}
        resultCount={total}
        activeCount={activeCount}
      />
    </>
  );
}

function EmptyState({
  filtered,
  query,
  onClear,
}: {
  filtered: boolean;
  query: string | undefined;
  onClear: () => void;
}) {
  const [title, body] = filtered
    ? [
        "No devices meet all of those conditions at once.",
        "Try widening one axis — grade and storage narrow a catalogue faster than anything else.",
      ]
    : query
      ? [`Nothing matches “${query}”.`, "Check the spelling, or try a brand or model name."]
      : ["Nothing is listed right now.", "Check back soon."];

  return (
    <div className="flex flex-col items-start gap-5 py-24 lg:py-32">
      <p className="eyebrow">Nothing matches</p>
      <p className="max-w-md text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-[1.1] tracking-[-0.03em] text-ink">
        {title}
      </p>
      <p className="max-w-md text-base leading-relaxed text-ink-secondary">{body}</p>
      {filtered && (
        <Button variant="outline" size="md" onClick={onClear} className="mt-2">
          Clear all filters
        </Button>
      )}
    </div>
  );
}

interface Chip {
  axis: FilterAxis;
  axisLabel: string;
  value: string;
  label: string;
}

function chipsFor(filters: ShopFilterState, facets: ShopFacets | undefined): Chip[] {
  const categoryName = (slug: string) =>
    facets?.categories.find((category) => category.slug === slug)?.name ?? slug;

  return [
    ...filters.category.map((value) => ({
      axis: "category" as const,
      axisLabel: "Category",
      value,
      label: categoryName(value),
    })),
    ...filters.condition.map((value) => ({
      axis: "condition" as const,
      axisLabel: "Condition",
      value,
      label: CONDITION_META[value].short,
    })),
    ...filters.grade.map((value) => ({
      axis: "grade" as const,
      axisLabel: "Grade",
      value,
      label: GRADE_META[value].label,
    })),
    ...filters.price.map((value) => ({
      axis: "price" as const,
      axisLabel: "Price",
      value,
      label: priceBands.find((band) => band.id === value)?.label ?? value,
    })),
    ...filters.brand.map((value) => ({
      axis: "brand" as const,
      axisLabel: "Brand",
      value,
      label: value,
    })),
    ...filters.storage.map((value) => ({
      axis: "storage" as const,
      axisLabel: "Storage",
      value,
      label: value,
    })),
  ];
}
