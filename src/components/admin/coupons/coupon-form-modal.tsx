"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { useCreateCoupon, useUpdateCoupon } from "@/hooks/use-coupon";
import { useGetCategories } from "@/hooks/use-category";
import { useGetProducts } from "@/hooks/use-product";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PICKER_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { CURRENCY, fromMinorUnits, toMinorUnits } from "@/lib/money";
import type { CouponType } from "@/lib/pricing/types";
import type { AdminCoupon } from "@/types/coupon";
import { COUPON_TYPES, couponSchema } from "@/validators/coupon.validator";

const PICKER_FILTERS = { pageSize: PICKER_PAGE_SIZE } as const;

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  PERCENT: "Percent off",
  FIXED: "Fixed amount off",
};

/** `datetime-local`'s value has no offset; a Date built from it is local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function CouponFormModal({ coupon, onClose }: { coupon?: AdminCoupon; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title={coupon ? "Edit discount code" : "Add discount code"}>
      <CouponForm initial={coupon} onClose={onClose} />
    </Dialog>
  );
}

function CouponForm({ initial, onClose }: { initial?: AdminCoupon; onClose: () => void }) {
  const id = useId();
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<CouponType>(initial?.type ?? "PERCENT");
  const [value, setValue] = useState(
    initial ? (initial.type === "PERCENT" ? String(initial.value) : fromMinorUnits(initial.value)) : "",
  );
  const [minOrderAmount, setMinOrderAmount] = useState(
    initial ? fromMinorUnits(initial.minOrderAmount) : "0",
  );
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt ?? null));
  const [active, setActive] = useState(initial?.active ?? true);
  const [usageLimit, setUsageLimit] = useState(initial?.usageLimit ? String(initial.usageLimit) : "");
  const [perCustomerLimit, setPerCustomerLimit] = useState(
    initial?.perCustomerLimit ? String(initial.perCustomerLimit) : "",
  );
  const [appliesToAll, setAppliesToAll] = useState(initial?.appliesToAll ?? true);
  const [productIds, setProductIds] = useState<string[]>(initial?.products.map((product) => product.id) ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initial?.categories.map((category) => category.id) ?? [],
  );
  const [productNames, setProductNames] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.products ?? []).map((product) => [product.id, product.name])),
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [productSearchInput, setProductSearchInput] = useState("");
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setProductSearch(productSearchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [productSearchInput]);

  const categories = useGetCategories(PICKER_FILTERS);
  const products = useGetProducts({ ...PICKER_FILTERS, search: productSearch || undefined });
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const mutation = initial ? updateCoupon : createCoupon;

  function toggleCategory(categoryId: string, checked: boolean) {
    setCategoryIds((current) =>
      checked ? [...current, categoryId] : current.filter((value) => value !== categoryId),
    );
  }

  function toggleProduct(productId: string, name: string, checked: boolean) {
    setProductIds((current) =>
      checked ? [...current, productId] : current.filter((value) => value !== productId),
    );
    if (checked) setProductNames((current) => ({ ...current, [productId]: name }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericValue = type === "PERCENT" ? Number(value) : toMinorUnits(value);
    const valueMinor = Number.isFinite(numericValue) ? numericValue : null;
    const minOrderMinor = toMinorUnits(minOrderAmount || "0");
    const usageLimitNum = usageLimit.trim() === "" ? null : Number.parseInt(usageLimit, 10);
    const perCustomerLimitNum =
      perCustomerLimit.trim() === "" ? null : Number.parseInt(perCustomerLimit, 10);

    const parsed = couponSchema.safeParse({
      code,
      description,
      type,
      value: valueMinor ?? 0,
      minOrderAmount: minOrderMinor ?? 0,
      startsAt: toIsoOrNull(startsAt),
      endsAt: toIsoOrNull(endsAt),
      active,
      usageLimit: usageLimitNum,
      perCustomerLimit: perCustomerLimitNum,
      appliesToAll,
      productIds: appliesToAll ? [] : productIds,
      categoryIds: appliesToAll ? [] : categoryIds,
    });

    const localErrors: Record<string, string[] | undefined> = parsed.success
      ? {}
      : z.flattenError(parsed.error).fieldErrors;
    if (valueMinor === null) {
      localErrors.value = [type === "PERCENT" ? "Enter a whole percent." : "Enter an amount like 50.00."];
    }
    if (minOrderMinor === null) {
      localErrors.minOrderAmount = ["Enter an amount like 50.00."];
    }
    if (!parsed.success || valueMinor === null || minOrderMinor === null) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (initial) updateCoupon.mutate({ id: initial.id, ...parsed.data }, callbacks);
    else createCoupon.mutate(parsed.data, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-code`} label="Code" error={error("code")}>
            <Input
              id={`${id}-code`}
              data-autofocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              aria-invalid={error("code") ? true : undefined}
              className="h-11 font-mono uppercase"
            />
          </Field>

          <Field id={`${id}-type`} label="Type" error={error("type")}>
            <Select
              id={`${id}-type`}
              value={type}
              onChange={(event) => setType(event.target.value as CouponType)}
              className="h-11"
            >
              {COUPON_TYPES.map((value) => (
                <option key={value} value={value}>
                  {COUPON_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id={`${id}-description`}
            label="Description"
            hint="Shown to staff only, not to shoppers."
            error={error("description")}
            className="sm:col-span-2"
          >
            <Input
              id={`${id}-description`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-value`}
            label={type === "PERCENT" ? "Percent off" : `Amount off (${CURRENCY})`}
            error={error("value")}
          >
            <Input
              id={`${id}-value`}
              inputMode={type === "PERCENT" ? "numeric" : "decimal"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={error("value") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-min`} label={`Minimum order (${CURRENCY})`} error={error("minOrderAmount")}>
            <Input
              id={`${id}-min`}
              inputMode="decimal"
              value={minOrderAmount}
              onChange={(event) => setMinOrderAmount(event.target.value)}
              aria-invalid={error("minOrderAmount") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-starts`} label="Starts" hint="Optional." error={error("startsAt")}>
            <Input
              id={`${id}-starts`}
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-ends`} label="Ends" hint="Optional." error={error("endsAt")}>
            <Input
              id={`${id}-ends`}
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-usage`}
            label="Total use limit"
            hint="Leave empty for unlimited."
            error={error("usageLimit")}
          >
            <Input
              id={`${id}-usage`}
              inputMode="numeric"
              value={usageLimit}
              onChange={(event) => setUsageLimit(event.target.value)}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-per-customer`}
            label="Per customer limit"
            hint="Leave empty for unlimited."
            error={error("perCustomerLimit")}
          >
            <Input
              id={`${id}-per-customer`}
              inputMode="numeric"
              value={perCustomerLimit}
              onChange={(event) => setPerCustomerLimit(event.target.value)}
              className="h-11"
            />
          </Field>

          <div className="flex flex-col gap-3 sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
              Active
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={appliesToAll}
                onChange={(event) => setAppliesToAll(event.target.checked)}
              />
              Applies to every product
            </label>
          </div>

          {!appliesToAll && (
            <>
              <fieldset className="sm:col-span-2">
                <legend className="eyebrow">Products</legend>
                <Input
                  type="search"
                  value={productSearchInput}
                  onChange={(event) => setProductSearchInput(event.target.value)}
                  placeholder="Search products by name"
                  aria-label="Search products"
                  className="mt-3 h-11"
                />
                {productIds.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {productIds.map((productId) => (
                      <li key={productId}>
                        <button
                          type="button"
                          onClick={() => toggleProduct(productId, productNames[productId] ?? "", false)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-xs text-ink-secondary transition-colors duration-(--duration-fast) hover:border-danger hover:text-danger"
                        >
                          {productNames[productId] ?? productId}
                          <span aria-hidden>×</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {products.isPending ? (
                  <p className="mt-3 text-sm text-ink-muted">Loading…</p>
                ) : products.isError ? (
                  <p className="mt-3 text-sm text-danger">{products.error.message}</p>
                ) : products.data.items.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">No products match.</p>
                ) : (
                  <ul className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface p-3">
                    {products.data.items.map((product) => (
                      <li key={product.id}>
                        <label className="inline-flex items-center gap-2 py-1 text-sm text-ink-secondary">
                          <input
                            type="checkbox"
                            checked={productIds.includes(product.id)}
                            onChange={(event) => toggleProduct(product.id, product.name, event.target.checked)}
                          />
                          {product.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <FieldError className="mt-2">{error("productIds")}</FieldError>
              </fieldset>

              <fieldset className="sm:col-span-2">
                <legend className="eyebrow">Categories</legend>
                {categories.isPending ? (
                  <p className="mt-3 text-sm text-ink-muted">Loading…</p>
                ) : categories.isError ? (
                  <p className="mt-3 text-sm text-danger">{categories.error.message}</p>
                ) : (
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {categories.data.items.map((parent) => (
                      <li key={parent.id} className="rounded-lg border border-line bg-surface p-3">
                        <CategoryCheckbox
                          name={parent.name}
                          checked={categoryIds.includes(parent.id)}
                          onChange={(checked) => toggleCategory(parent.id, checked)}
                        />
                        {parent.children.length > 0 && (
                          <ul className="mt-2 flex flex-col gap-1.5 pl-5">
                            {parent.children.map((child) => (
                              <li key={child.id}>
                                <CategoryCheckbox
                                  name={child.name}
                                  checked={categoryIds.includes(child.id)}
                                  onChange={(checked) => toggleCategory(child.id, checked)}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <FieldError className="mt-2">{error("categoryIds")}</FieldError>
              </fieldset>
            </>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        {mutation.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {mutation.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={mutation.isPending}>
          {initial ? "Save changes" : "Add discount code"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CategoryCheckbox({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {name}
    </label>
  );
}
