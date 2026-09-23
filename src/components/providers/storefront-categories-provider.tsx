"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StorefrontCategory } from "@/types/catalogue";

const StorefrontCategoriesContext = createContext<StorefrontCategory[]>([]);

export function StorefrontCategoriesProvider({
  categories,
  children,
}: {
  categories: StorefrontCategory[];
  children: ReactNode;
}) {
  return (
    <StorefrontCategoriesContext.Provider value={categories}>
      {children}
    </StorefrontCategoriesContext.Provider>
  );
}

export function useStorefrontCategories(): StorefrontCategory[] {
  return useContext(StorefrontCategoriesContext);
}
