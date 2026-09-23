"use client";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { conditionLabel, gradeLabel } from "@/lib/catalogue";
import { CURRENCY } from "@/lib/money";
import {
  GRADED_CONDITIONS,
  MAX_VARIANTS,
  PRODUCT_CONDITIONS,
  PRODUCT_GRADES,
  type ProductCondition,
  type ProductGrade,
} from "@/validators/product.validator";

export interface DraftVariant {
  key: string;
  id?: string;
  condition: ProductCondition;
  grade: ProductGrade | "";
  batteryHealth: string;
  sku: string;
  storage: string;
  colour: string;
  colourHex: string;
  price: string;
  compareAtPrice: string;
  stock: string;
}

let keyCount = 0;
export const newVariantKey = () => `variant-${++keyCount}`;

export const emptyVariant = (from?: DraftVariant): DraftVariant => ({
  key: newVariantKey(),
  condition: from?.condition ?? "REFURBISHED",
  grade: from?.grade ?? "",
  batteryHealth: "",
  sku: "",
  storage: "",
  colour: "",
  colourHex: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
});

type TextField = Exclude<keyof DraftVariant, "key" | "id" | "condition" | "grade">;

const STATE_FIELDS = ["condition", "grade", "batteryHealth"] as const;

const FIELDS: { name: TextField; label: string; inputMode?: "decimal" | "numeric" }[] = [
  { name: "sku", label: "SKU" },
  { name: "storage", label: "Storage" },
  { name: "colour", label: "Colour" },
  { name: "colourHex", label: "Hex" },
  { name: "price", label: `Price (${CURRENCY})`, inputMode: "decimal" },
  { name: "compareAtPrice", label: `Was (${CURRENCY})`, inputMode: "decimal" },
  { name: "stock", label: "Stock", inputMode: "numeric" },
];

export function ProductVariantsEditor({
  variants,
  onChange,
  error,
  errorAt,
}: {
  variants: DraftVariant[];
  onChange: (next: DraftVariant[]) => void;
  error?: string;
  errorAt: (path: string) => string | undefined;
}) {
  function update(key: string, patch: Partial<DraftVariant>) {
    onChange(variants.map((variant) => (variant.key === key ? { ...variant, ...patch } : variant)));
  }

  return (
    <fieldset>
      <legend className="eyebrow">Variants</legend>

      <ul className="mt-4 flex flex-col gap-3">
        {variants.map((variant, index) => {
          const rowError =
            errorAt(`variants.${index}`) ??
            [...STATE_FIELDS, ...FIELDS.map((field) => field.name)]
              .map((name) => errorAt(`variants.${index}.${name}`))
              .find(Boolean);
          const graded = GRADED_CONDITIONS.includes(variant.condition);

          return (
            <li key={variant.key} className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs text-ink-muted">
                  Condition
                  <Select
                    value={variant.condition}
                    onChange={(event) => {
                      const condition = event.target.value as ProductCondition;
                      update(variant.key, {
                        condition,
                        ...(GRADED_CONDITIONS.includes(condition) ? {} : { grade: "" }),
                      });
                    }}
                    className="h-9 px-2 text-sm"
                  >
                    {PRODUCT_CONDITIONS.map((value) => (
                      <option key={value} value={value}>
                        {conditionLabel(value)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-ink-muted">
                  Grade
                  <Select
                    value={variant.grade}
                    disabled={!graded}
                    onChange={(event) =>
                      update(variant.key, { grade: event.target.value as ProductGrade | "" })
                    }
                    aria-invalid={errorAt(`variants.${index}.grade`) ? true : undefined}
                    className="h-9 px-2 text-sm"
                  >
                    <option value="">No grade</option>
                    {PRODUCT_GRADES.map((value) => (
                      <option key={value} value={value}>
                        {gradeLabel(value)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-ink-muted">
                  Battery health (%)
                  <Input
                    value={variant.batteryHealth}
                    inputMode="numeric"
                    onChange={(event) => update(variant.key, { batteryHealth: event.target.value })}
                    aria-invalid={errorAt(`variants.${index}.batteryHealth`) ? true : undefined}
                    className="h-9 px-2 text-sm"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_6rem_1fr_1fr_5rem_auto] lg:items-end">
                {FIELDS.map((field) => (
                  <label key={field.name} className="flex flex-col gap-1 text-xs text-ink-muted">
                    {field.label}
                    <Input
                      value={variant[field.name]}
                      inputMode={field.inputMode}
                      onChange={(event) => update(variant.key, { [field.name]: event.target.value })}
                      aria-invalid={errorAt(`variants.${index}.${field.name}`) ? true : undefined}
                      className="h-9 px-2 text-sm"
                    />
                  </label>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3"
                  disabled={variants.length === 1}
                  onClick={() => onChange(variants.filter((item) => item.key !== variant.key))}
                >
                  Remove
                </Button>
              </div>
              <FieldError>{rowError}</FieldError>
            </li>
          );
        })}
      </ul>

      <FieldError>{error}</FieldError>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={variants.length >= MAX_VARIANTS}
        onClick={() => onChange([...variants, emptyVariant(variants.at(-1))])}
      >
        Add variant
      </Button>
    </fieldset>
  );
}
