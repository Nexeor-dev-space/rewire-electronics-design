"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { AdminPage } from "@/components/admin/admin-page";
import { Section } from "@/components/admin/shared/detail-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import {
  useCreateCampaign,
  useGetCampaign,
  useGetCampaignTypes,
  useUpdateCampaign,
} from "@/hooks/use-campaign";
import { useGetProducts } from "@/hooks/use-product";
import { apiFieldErrors } from "@/lib/api/api-client";
import {
  ADMIN_CAMPAIGNS_PATH,
  CAMPAIGN_DESCRIPTION_MAX_LENGTH,
  CAMPAIGN_NAME_MAX_LENGTH,
  CAMPAIGN_SLUG_MAX_LENGTH,
  MAX_CAMPAIGN_PRODUCTS,
  PICKER_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants";
import { fromStoreDateTimeInput, toStoreDateTimeInput } from "@/lib/dates";
import { CURRENCY, fromMinorUnits, toMinorUnits } from "@/lib/money";
import type { CouponType } from "@/lib/pricing/types";
import { slugify } from "@/lib/utils";
import type { AdminCampaign } from "@/types/campaign";
import { campaignSchema } from "@/validators/campaign.validator";
import { CampaignDetailError, CampaignDetailSkeleton } from "./campaign-detail";
import { campaignHref } from "./campaign-management";

const DATE_REQUIRED = "Enter a date and time.";
const DISCOUNT_REQUIRED = "Enter a discount for every product.";

interface ProductRow {
  id: string;
  name: string;
  discountType: CouponType;
  /** As typed: a whole percent, or an amount in dirhams. */
  discountValue: string;
}

export function CampaignFormPage() {
  return (
    <AdminPage title="New campaign" description="Saved as a draft. Publish it from its details page.">
      <CampaignForm />
    </AdminPage>
  );
}

export function CampaignEdit({ id }: { id: string }) {
  const detail = useGetCampaign(id);

  if (detail.isPending) {
    return (
      <AdminPage title="Edit campaign">
        <CampaignDetailSkeleton />
      </AdminPage>
    );
  }

  if (detail.isError) {
    return (
      <AdminPage title="Edit campaign">
        <CampaignDetailError message={detail.error.message} onRetry={() => detail.refetch()} />
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Edit campaign" description={detail.data.name}>
      <CampaignForm initial={detail.data} />
    </AdminPage>
  );
}

function CampaignForm({ initial }: { initial?: AdminCampaign }) {
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [typeId, setTypeId] = useState(initial?.type.id ?? "");
  const [startsAt, setStartsAt] = useState(toStoreDateTimeInput(initial?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toStoreDateTimeInput(initial?.endsAt ?? null));
  const [rows, setRows] = useState<ProductRow[]>(
    (initial?.products ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      discountType: product.discountType,
      discountValue:
        product.discountType === "PERCENT" ? String(product.discountValue) : fromMinorUnits(product.discountValue),
    })),
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [productSearchInput, setProductSearchInput] = useState("");
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setProductSearch(productSearchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [productSearchInput]);

  const types = useGetCampaignTypes();
  const products = useGetProducts({ pageSize: PICKER_PAGE_SIZE, search: productSearch || undefined });
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const mutation = initial ? updateCampaign : createCampaign;

  function changeName(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function toggleProduct(productId: string, productName: string, checked: boolean) {
    setRows((current) =>
      checked
        ? [...current, { id: productId, name: productName, discountType: "PERCENT", discountValue: "" }]
        : current.filter((row) => row.id !== productId),
    );
  }

  function changeRow(productId: string, change: Partial<ProductRow>) {
    setRows((current) => current.map((row) => (row.id === productId ? { ...row, ...change } : row)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const discounts = rows.map((row) =>
      row.discountType === "PERCENT" ? Number(row.discountValue || NaN) : toMinorUnits(row.discountValue),
    );
    const discountsValid = discounts.every((value) => value !== null && Number.isFinite(value));

    const startIso = fromStoreDateTimeInput(startsAt);
    const endIso = fromStoreDateTimeInput(endsAt);
    const parsed = campaignSchema.safeParse({
      name,
      description,
      slug,
      typeId,
      startsAt: startIso,
      endsAt: endIso,
      products: rows.map((row, index) => ({
        productId: row.id,
        discountType: row.discountType,
        discountValue: discounts[index] ?? 0,
      })),
    });

    const localErrors: Record<string, string[] | undefined> = parsed.success
      ? {}
      : z.flattenError(parsed.error).fieldErrors;
    if (!startIso) localErrors.startsAt = [DATE_REQUIRED];
    if (!endIso) localErrors.endsAt = [DATE_REQUIRED];
    if (!typeId) localErrors.typeId = ["Choose a campaign type."];
    if (!discountsValid) localErrors.products = [DISCOUNT_REQUIRED];
    if (!parsed.success || !discountsValid) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: (saved: AdminCampaign) => router.push(campaignHref(saved.id)),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (initial) updateCampaign.mutate({ id: initial.id, ...parsed.data }, callbacks);
    else createCampaign.mutate(parsed.data, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];
  const hasFieldError = Object.values(errors).some((messages) => messages?.length);
  const selected = new Set(rows.map((row) => row.id));
  const atLimit = rows.length >= MAX_CAMPAIGN_PRODUCTS;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Section title="Campaign details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-name`} label="Campaign name" error={error("name")}>
            <Input
              id={`${id}-name`}
              data-autofocus
              value={name}
              maxLength={CAMPAIGN_NAME_MAX_LENGTH}
              onChange={(event) => changeName(event.target.value)}
              aria-invalid={error("name") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-type`}
            label="Campaign type"
            hint={
              types.data?.items.length === 0
                ? "No types yet. Add one with Campaign types on the Campaigns page."
                : undefined
            }
            error={error("typeId") ?? (types.isError ? types.error.message : undefined)}
          >
            <Select
              id={`${id}-type`}
              value={typeId}
              onChange={(event) => setTypeId(event.target.value)}
              aria-invalid={error("typeId") ? true : undefined}
              className="h-11"
            >
              <option value="">Choose a type</option>
              {types.data?.items.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id={`${id}-slug`}
            label="Campaign URL"
            hint="Lowercase letters, numbers and hyphens."
            error={error("slug")}
            className="sm:col-span-2"
          >
            <Input
              id={`${id}-slug`}
              value={slug}
              maxLength={CAMPAIGN_SLUG_MAX_LENGTH}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugTouched(true);
              }}
              aria-invalid={error("slug") ? true : undefined}
              className="h-11 font-mono"
            />
          </Field>

          <Field id={`${id}-starts`} label="Starts" hint="Store time (Dubai)." error={error("startsAt")}>
            <Input
              id={`${id}-starts`}
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              aria-invalid={error("startsAt") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-ends`} label="Ends" hint="Store time (Dubai)." error={error("endsAt")}>
            <Input
              id={`${id}-ends`}
              type="datetime-local"
              value={endsAt}
              min={startsAt || undefined}
              onChange={(event) => setEndsAt(event.target.value)}
              aria-invalid={error("endsAt") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-description`}
            label="Description"
            hint="Optional."
            error={error("description")}
            className="sm:col-span-2"
          >
            <Textarea
              id={`${id}-description`}
              value={description}
              maxLength={CAMPAIGN_DESCRIPTION_MAX_LENGTH}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Products and discounts">
        <p className="text-sm text-ink-secondary">
          Each discount applies to all of that product&apos;s variants. While the campaign runs, discount codes
          don&apos;t apply to these products.
        </p>

        {rows.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <p className="min-w-40 flex-1 text-sm text-ink">{row.name}</p>
                <Select
                  value={row.discountType}
                  onChange={(event) => changeRow(row.id, { discountType: event.target.value as CouponType })}
                  aria-label={`Discount type for ${row.name}`}
                  className="h-10 w-36"
                >
                  <option value="PERCENT">Percent off</option>
                  <option value="FIXED">{CURRENCY} off</option>
                </Select>
                <Input
                  inputMode={row.discountType === "PERCENT" ? "numeric" : "decimal"}
                  value={row.discountValue}
                  onChange={(event) => changeRow(row.id, { discountValue: event.target.value })}
                  aria-label={`Discount for ${row.name}`}
                  className="h-10 w-28"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => toggleProduct(row.id, row.name, false)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <FieldError className="mt-2">{error("products")}</FieldError>

        <Input
          type="search"
          value={productSearchInput}
          onChange={(event) => setProductSearchInput(event.target.value)}
          placeholder="Search products by name"
          aria-label="Search products"
          className="mt-4 h-11"
        />
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
                    checked={selected.has(product.id)}
                    disabled={atLimit && !selected.has(product.id)}
                    onChange={(event) => toggleProduct(product.id, product.name, event.target.checked)}
                  />
                  {product.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" loading={mutation.isPending}>
          {initial ? "Save changes" : "Save as draft"}
        </Button>
        <Link
          href={initial ? campaignHref(initial.id) : ADMIN_CAMPAIGNS_PATH}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Cancel
        </Link>
        {mutation.isError && !hasFieldError && (
          <p role="alert" className="text-sm text-danger">
            {mutation.error.message}
          </p>
        )}
      </div>
    </form>
  );
}
