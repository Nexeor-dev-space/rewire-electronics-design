"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { GRADE_META } from "@/lib/shop";
import type { ShopVariant } from "@/types/catalogue";
import { ConditionExplainer } from "./condition-explainer";

interface SelectedVariantValue {
  variant: ShopVariant;
  select: (variantId: string) => void;
}

const SelectedVariantContext = createContext<SelectedVariantValue | null>(null);

export function SelectedVariantProvider({
  variants,
  children,
}: {
  variants: ShopVariant[];
  children: ReactNode;
}) {
  const [variantId, setVariantId] = useState(
    () => (variants.find((variant) => variant.stock > 0) ?? variants[0]).id,
  );
  const variant = variants.find((entry) => entry.id === variantId) ?? variants[0];

  return (
    <SelectedVariantContext.Provider value={{ variant, select: setVariantId }}>
      {children}
    </SelectedVariantContext.Provider>
  );
}

export function useSelectedVariant(): SelectedVariantValue {
  const value = useContext(SelectedVariantContext);
  if (!value) throw new Error("useSelectedVariant must be used inside SelectedVariantProvider.");
  return value;
}

export function SelectedConditionExplainer() {
  const { variant } = useSelectedVariant();
  return (
    <ConditionExplainer
      active={variant.condition}
      grade={variant.grade ? GRADE_META[variant.grade].label : undefined}
    />
  );
}
