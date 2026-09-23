"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { MAX_SPECS } from "@/validators/product.validator";

export interface DraftSpec {
  key: string;
  group: string;
  label: string;
  value: string;
}

let keyCount = 0;
export const newSpecKey = () => `spec-${++keyCount}`;

const FIELDS = [
  { name: "group", label: "Group" },
  { name: "label", label: "Label" },
  { name: "value", label: "Value" },
] as const;

export function ProductSpecsEditor({
  specs,
  onChange,
  error,
  errorAt,
}: {
  specs: DraftSpec[];
  onChange: (next: DraftSpec[]) => void;
  error?: string;
  errorAt: (path: string) => string | undefined;
}) {
  function update(key: string, patch: Partial<DraftSpec>) {
    onChange(specs.map((spec) => (spec.key === key ? { ...spec, ...patch } : spec)));
  }

  function add() {
    const group = specs.at(-1)?.group ?? "";
    onChange([...specs, { key: newSpecKey(), group, label: "", value: "" }]);
  }

  return (
    <fieldset>
      <legend className="eyebrow">Specifications</legend>

      {specs.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {specs.map((spec, index) => (
            <li key={spec.key}>
              <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] items-end gap-2">
                {FIELDS.map((field) => (
                  <Input
                    key={field.name}
                    value={spec[field.name]}
                    placeholder={field.label}
                    aria-label={`${field.label} ${index + 1}`}
                    aria-invalid={errorAt(`specs.${index}.${field.name}`) ? true : undefined}
                    onChange={(event) => update(spec.key, { [field.name]: event.target.value })}
                    className="h-9 px-2 text-sm"
                  />
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => onChange(specs.filter((item) => item.key !== spec.key))}
                >
                  Remove
                </Button>
              </div>
              <FieldError>
                {FIELDS.map((field) => errorAt(`specs.${index}.${field.name}`)).find(Boolean)}
              </FieldError>
            </li>
          ))}
        </ul>
      )}

      <FieldError>{error}</FieldError>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={specs.length >= MAX_SPECS}
        onClick={add}
      >
        Add spec
      </Button>
    </fieldset>
  );
}
