"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetProducts } from "@/hooks/use-product";
import { PICKER_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import type { SectionItemProduct } from "@/types/homepage";

interface ProductPickerProps {
  /** Products already chosen, offered as "Added" rather than again. */
  chosenIds: string[];
  /** False once the section holds as many items as it can. */
  canAdd: boolean;
  onPick: (product: SectionItemProduct) => void;
}

/**
 * Searches Catalogue → Products and hands back the one picked. Its image is
 * the product's own — the homepage never stores a copy. Any status can be
 * picked; one that isn't published stays off the storefront until it is.
 */
export function ProductPicker({ chosenIds, canAdd, onPick }: ProductPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const products = useGetProducts({ pageSize: PICKER_PAGE_SIZE, search: search || undefined });
  const chosen = new Set(chosenIds);

  let list;
  if (products.isPending) {
    list = <p className="mt-3 text-sm text-ink-muted">Loading…</p>;
  } else if (products.isError) {
    list = <p className="mt-3 text-sm text-danger">{products.error.message}</p>;
  } else if (products.data.items.length === 0) {
    list = <p className="mt-3 text-sm text-ink-muted">No products match.</p>;
  } else {
    list = (
      <ul className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-line bg-surface p-2">
        {products.data.items.map((product) => (
          <li key={product.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
            <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-surface-2">
              {product.imageUrl && (
                <Image src={product.imageUrl} alt="" fill sizes="36px" className="object-contain" unoptimized />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{product.name}</span>
              {product.status !== "PUBLISHED" && (
                <span className="block text-xs text-ink-muted">
                  {product.status === "DRAFT" ? "Draft" : "Archived"} · hidden on the storefront
                </span>
              )}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={chosen.has(product.id) || !canAdd}
              onClick={() =>
                onPick({
                  id: product.id,
                  name: product.name,
                  imageUrl: product.imageUrl,
                  onStorefront: product.status === "PUBLISHED",
                })
              }
            >
              {chosen.has(product.id) ? "Added" : "Add"}
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
        placeholder="Search products by name"
        aria-label="Search products"
        className="mt-3 h-11"
      />
      {list}
    </div>
  );
}
