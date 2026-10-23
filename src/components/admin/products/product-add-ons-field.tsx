"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAddOns } from "@/hooks/use-add-on";
import { ADD_ON_KIND_LABELS } from "@/lib/catalogue";
import { MAX_PRODUCT_ADD_ONS, PICKER_PAGE_SIZE } from "@/lib/constants";
import { CURRENCY, formatMoney, fromMinorUnits } from "@/lib/money";
import type { AddOnKind } from "@/validators/add-on.validator";
import type { ProductAddOnDetail } from "@/types/product";

export interface DraftAddOnPick {
  addOnId: string;
  priceOverride: string;
}

const ACTIVE_ADD_ONS = { pageSize: PICKER_PAGE_SIZE, active: "true" } as const;

interface Option {
  id: string;
  name: string;
  kind: AddOnKind;
  price: number;
  active: boolean;
}

export function ProductAddOnsField({
  picks,
  onChange,
  current,
  error,
  errorAt,
}: {
  picks: DraftAddOnPick[];
  onChange: (picks: DraftAddOnPick[]) => void;
  current: ProductAddOnDetail[];
  error?: string;
  errorAt: (path: string) => string | undefined;
}) {
  const addOns = useGetAddOns(ACTIVE_ADD_ONS);

  const active: Option[] = (addOns.data?.items ?? []).map(({ id, name, kind, price }) => ({
    id,
    name,
    kind,
    price,
    active: true,
  }));
  const activeIds = new Set(active.map((option) => option.id));
  const switchedOff: Option[] = current
    .filter((pick) => !pick.active && !activeIds.has(pick.addOnId))
    .map(({ addOnId, name, kind, price }) => ({ id: addOnId, name, kind, price, active: false }));
  const options = [...active, ...switchedOff];

  const indexOf = (id: string) => picks.findIndex((pick) => pick.addOnId === id);
  const full = picks.length >= MAX_PRODUCT_ADD_ONS;

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...picks, { addOnId: id, priceOverride: "" }] : picks.filter((pick) => pick.addOnId !== id));
  }

  function setOverride(id: string, priceOverride: string) {
    onChange(picks.map((pick) => (pick.addOnId === id ? { ...pick, priceOverride } : pick)));
  }

  return (
    <fieldset>
      <legend className="eyebrow">Add-ons</legend>
      <p className="mt-2 text-xs text-ink-muted">
        Picking any add-on here replaces the category add-ons for this product. Up to {MAX_PRODUCT_ADD_ONS}. Leave
        the price empty to charge the catalogue price.
      </p>

      {addOns.isPending ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : addOns.isError ? (
        <div className="mt-4 flex items-center gap-3">
          <p role="alert" className="text-sm text-danger">
            {addOns.error.message}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => addOns.refetch()}>
            Try again
          </Button>
        </div>
      ) : options.length === 0 ? (
        <p className="mt-4 text-sm text-ink-secondary">No add-ons yet. Create them under Catalogue, Add-ons.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {options.map((option) => {
            const index = indexOf(option.id);
            const picked = index !== -1;
            return (
              <li key={option.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <label className="flex min-w-0 items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={picked}
                    disabled={!picked && full}
                    onChange={(event) => toggle(option.id, event.target.checked)}
                  />
                  <span className="truncate">{option.name}</span>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {ADD_ON_KIND_LABELS[option.kind]} · {formatMoney(option.price)}
                  </span>
                  {!option.active && <Badge variant="outline">Off</Badge>}
                </label>
                {picked && (
                  <Input
                    inputMode="decimal"
                    value={picks[index].priceOverride}
                    placeholder={fromMinorUnits(option.price)}
                    aria-label={`Override price (${CURRENCY}) for ${option.name}`}
                    aria-invalid={errorAt(`addOns.${index}.priceOverride`) ? true : undefined}
                    onChange={(event) => setOverride(option.id, event.target.value)}
                    className="h-9 w-32 px-2 text-sm"
                  />
                )}
                {picked && (
                  <FieldError className="col-span-2">
                    {errorAt(`addOns.${index}.priceOverride`) ?? errorAt(`addOns.${index}.addOnId`)}
                  </FieldError>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <FieldError>{error}</FieldError>
    </fieldset>
  );
}
