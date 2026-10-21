"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetCategories } from "@/hooks/use-category";
import { PICKER_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import type { CategoryNode } from "@/types/category";
import type { SectionItemCategory } from "@/types/homepage";

interface CategoryPickerProps {
  chosenIds: string[];
  canAdd: boolean;
  onPick: (category: SectionItemCategory) => void;
}

function flattenCategories(nodes: CategoryNode[]): SectionItemCategory[] {
  return nodes.flatMap((parent) => {
    const parentListed = parent.status === "PUBLISHED";
    return [
      { id: parent.id, name: parent.name, imageUrl: parent.imageUrl, onStorefront: parentListed },
      ...parent.children.map((child) => ({
        id: child.id,
        name: `${parent.name} › ${child.name}`,
        imageUrl: child.imageUrl,
        onStorefront: parentListed && child.status === "PUBLISHED",
      })),
    ];
  });
}

export function CategoryPicker({ chosenIds, canAdd, onPick }: CategoryPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const categories = useGetCategories({ pageSize: PICKER_PAGE_SIZE, search: search || undefined });
  const chosen = new Set(chosenIds);

  let list;
  if (categories.isPending) {
    list = <p className="mt-3 text-sm text-ink-muted">Loading…</p>;
  } else if (categories.isError) {
    list = <p className="mt-3 text-sm text-danger">{categories.error.message}</p>;
  } else if (categories.data.items.length === 0) {
    list = <p className="mt-3 text-sm text-ink-muted">No categories match.</p>;
  } else {
    list = (
      <ul className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-line bg-surface p-2">
        {flattenCategories(categories.data.items).map((category) => (
          <li key={category.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
            <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-surface-2">
              {category.imageUrl && (
                <Image src={category.imageUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{category.name}</span>
              {!category.onStorefront && (
                <span className="block text-xs text-ink-muted">Hidden on the storefront</span>
              )}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={chosen.has(category.id) || !canAdd}
              onClick={() => onPick(category)}
            >
              {chosen.has(category.id) ? "Added" : "Add"}
            </Button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search categories by name"
        aria-label="Search categories"
        className="mt-3 h-11"
      />
      {list}
    </div>
  );
}
