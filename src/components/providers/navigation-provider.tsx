"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useStorefrontCategories } from "@/components/providers/storefront-categories-provider";
import { applyParts, defaultNavigation, toPublishedNavigation } from "@/lib/navigation-config";
import type { StorefrontCategory } from "@/types/catalogue";
import type { PublishedNavigation } from "@/types/navigation";
import type { StorefrontReleaseSummary } from "@/types/storefront-release";

const NavigationContext = createContext<PublishedNavigation>(
  toPublishedNavigation(defaultNavigation()),
);

const DropsContext = createContext<StorefrontReleaseSummary[]>([]);

export function NavigationProvider({
  navigation,
  drops,
  children,
}: {
  navigation: PublishedNavigation;
  /** The upcoming drops the header may list, before staff hide any. */
  drops: StorefrontReleaseSummary[];
  children: ReactNode;
}) {
  return (
    <NavigationContext.Provider value={navigation}>
      <DropsContext.Provider value={drops}>{children}</DropsContext.Provider>
    </NavigationContext.Provider>
  );
}

/** The published header, footer and mobile bar navigation. */
export function useNavigation(): PublishedNavigation {
  return useContext(NavigationContext);
}

/** The categories the header lists: staff's order, hidden ones removed. */
export function useHeaderCategories(): StorefrontCategory[] {
  const categories = useStorefrontCategories();
  const { categories: parts } = useNavigation().header;
  return useMemo(() => applyParts(categories, parts), [categories, parts]);
}

/** Whether staff left the Categories menu on in the header. Off, the shop filter drops its Category group too. */
export function useCategoriesMenuShown(): boolean {
  const { rail } = useNavigation().header;
  return rail.some((item) => !("href" in item) && item.id === "categories");
}

/** Slugs of the categories staff hid on the Navigation screen: the shop filter leaves them out too. */
export function useHiddenCategorySlugs(): Set<string> {
  const all = useStorefrontCategories();
  const shown = useHeaderCategories();
  return useMemo(() => {
    const shownIds = new Set(shown.map((category) => category.id));
    return new Set(all.filter((category) => !shownIds.has(category.id)).map((category) => category.slug));
  }, [all, shown]);
}

/** The upcoming drops the header lists: staff's order, hidden ones removed. */
export function useHeaderDrops(): StorefrontReleaseSummary[] {
  const drops = useContext(DropsContext);
  const { drops: parts } = useNavigation().header;
  return useMemo(() => applyParts(drops, parts), [drops, parts]);
}
