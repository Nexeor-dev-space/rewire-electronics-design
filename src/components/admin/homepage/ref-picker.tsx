"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { useGetBrands } from "@/hooks/use-brand";
import { useGetCategories } from "@/hooks/use-category";
import { PICKER_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { flattenCategoryRefs, swapItems } from "@/lib/homepage-builder";
import { MAX_SECTION_REFS } from "@/lib/homepage-sections";
import type { SectionRef } from "@/types/homepage";

interface RefPickerProps {
  kind: "brands" | "categories";
  /** Chosen items in display order. */
  value: SectionRef[];
  onChange: (refs: SectionRef[]) => void;
  error?: string;
}

/**
 * Chooses the brands or categories a featured section shows. One page of
 * search results is enough to pick from; the chosen list keeps its order and
 * can be rearranged.
 */
export function RefPicker({ kind, value, onChange, error }: RefPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const noun = kind === "brands" ? "brands" : "categories";
  const listProps = { search, value, onChange };

  return (
    <fieldset>
      <legend className="eyebrow">
        {kind === "brands" ? "Brands" : "Categories"} ({value.length}/{MAX_SECTION_REFS})
      </legend>

      {value.length > 0 && (
        <ol className="mt-3 flex flex-col gap-1.5">
          {value.map((ref, index) => (
            <li
              key={ref.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              <span className="min-w-0 flex-1 truncate">{ref.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => onChange(swapItems(value, index, -1))}
                aria-label={`Move ${ref.name} up`}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === value.length - 1}
                onClick={() => onChange(swapItems(value, index, 1))}
                aria-label={`Move ${ref.name} down`}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((item) => item.id !== ref.id))}
                aria-label={`Remove ${ref.name}`}
              >
                ×
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder={`Search ${noun} by name`}
        aria-label={`Search ${noun}`}
        className="mt-3 h-11"
      />

      {kind === "brands" ? <BrandOptions {...listProps} /> : <CategoryOptions {...listProps} />}

      <FieldError className="mt-2">{error}</FieldError>
    </fieldset>
  );
}

interface OptionsProps {
  search: string;
  value: SectionRef[];
  onChange: (refs: SectionRef[]) => void;
}

function BrandOptions({ search, ...props }: OptionsProps) {
  const brands = useGetBrands({ pageSize: PICKER_PAGE_SIZE, search: search || undefined });
  return (
    <OptionList
      {...props}
      noun="brands"
      pending={brands.isPending}
      error={brands.isError ? brands.error.message : null}
      options={(brands.data?.items ?? []).map(({ id, name }) => ({ id, name }))}
    />
  );
}

function CategoryOptions({ search, ...props }: OptionsProps) {
  const categories = useGetCategories({ pageSize: PICKER_PAGE_SIZE, search: search || undefined });
  return (
    <OptionList
      {...props}
      noun="categories"
      pending={categories.isPending}
      error={categories.isError ? categories.error.message : null}
      options={flattenCategoryRefs(categories.data?.items ?? [])}
    />
  );
}

function OptionList({
  noun,
  pending,
  error,
  options,
  value,
  onChange,
}: Omit<OptionsProps, "search"> & {
  noun: string;
  pending: boolean;
  error: string | null;
  options: SectionRef[];
}) {
  if (pending) return <p className="mt-3 text-sm text-ink-muted">Loading…</p>;
  if (error) return <p className="mt-3 text-sm text-danger">{error}</p>;
  if (options.length === 0) return <p className="mt-3 text-sm text-ink-muted">No {noun} match.</p>;

  const chosen = new Set(value.map((ref) => ref.id));
  const full = value.length >= MAX_SECTION_REFS;

  return (
    <ul className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface p-3">
      {options.map((option) => (
        <li key={option.id}>
          <label className="inline-flex items-center gap-2 py-1 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={chosen.has(option.id)}
              disabled={full && !chosen.has(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, option]
                    : value.filter((item) => item.id !== option.id),
                )
              }
            />
            {option.name}
          </label>
        </li>
      ))}
    </ul>
  );
}
