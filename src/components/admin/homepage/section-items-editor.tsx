"use client";

import { useId } from "react";
import Image from "next/image";
import { CategoryPicker } from "@/components/admin/homepage/category-picker";
import { ProductPicker } from "@/components/admin/homepage/product-picker";
import { ImageField } from "@/components/admin/shared/image-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { STORE_TIME_ZONE_LABEL } from "@/lib/constants";
import { formatStoreDateTime, fromStoreDateTimeInput, toStoreDateTimeInput } from "@/lib/dates";
import { emptyItemInput, swapItems, type SectionItemFormInput } from "@/lib/homepage-builder";
import {
  ITEM_TEXT_LIMITS,
  MAX_SECTION_ITEMS,
  itemErrorKey,
  type ItemField,
  type SectionItemKind,
} from "@/lib/homepage-sections";
import type { SectionItemCategory, SectionItemProduct } from "@/types/homepage";

/** One item as the form holds it: the body plus what the form shows beside it. */
export interface ItemDraft {
  /** The item's id, or a temporary key for one not saved yet. */
  key: string;
  input: SectionItemFormInput;
  product: SectionItemProduct | null;
  category: SectionItemCategory | null;
  /** Preview of `input.imageId`. */
  imageUrl: string | null;
}

let nextKey = 0;

export function newItemDraft(
  product: SectionItemProduct | null = null,
  category: SectionItemCategory | null = null,
): ItemDraft {
  nextKey += 1;
  return {
    key: `new-${nextKey}`,
    input: { ...emptyItemInput(), productId: product?.id ?? null, categoryId: category?.id ?? null },
    product,
    category,
    imageUrl: null,
  };
}

const HEADINGS: Record<SectionItemKind, string> = {
  drops: "Drops",
  products: "Products",
  reviews: "Reviews",
  categories: "Categories",
};

interface SectionItemsEditorProps {
  kind: SectionItemKind;
  value: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
  /** Field errors keyed as the API sends them: `items`, `items.2.title`. */
  errors: Record<string, string[] | undefined>;
}

/**
 * The drops, Just Listed picks or reviews inside a section. Each can be
 * moved, hidden and removed; the list is saved with the section.
 */
export function SectionItemsEditor({ kind, value, onChange, errors }: SectionItemsEditorProps) {
  const full = value.length >= MAX_SECTION_ITEMS;
  const chosenIds = value.flatMap((item) => {
    const chosenId = kind === "categories" ? item.input.categoryId : item.input.productId;
    return chosenId ? [chosenId] : [];
  });

  function update(index: number, next: ItemDraft) {
    onChange(value.map((item, at) => (at === index ? next : item)));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="eyebrow">
        {HEADINGS[kind]} ({value.length}/{MAX_SECTION_ITEMS})
      </legend>

      {kind === "products" && (
        <p className="text-sm text-ink-secondary">
          Leave empty to show the newest products automatically. Picks that aren&rsquo;t
          published or in stock are skipped on the storefront.
        </p>
      )}

      {value.length > 0 && (
        <ol className="flex flex-col gap-3">
          {value.map((item, index) => (
            <li key={item.key} className="rounded-lg border border-line bg-surface p-4">
              <ItemCard
                kind={kind}
                item={item}
                index={index}
                count={value.length}
                errors={errors}
                onChange={(next) => update(index, next)}
                onMove={(offset) => onChange(swapItems(value, index, offset))}
                onRemove={() => onChange(value.filter((_, at) => at !== index))}
              />
            </li>
          ))}
        </ol>
      )}

      {kind === "categories" ? (
        <div>
          <p className="text-sm text-ink-secondary">Add from Catalogue → Categories</p>
          <CategoryPicker
            chosenIds={chosenIds}
            canAdd={!full}
            onPick={(category) => onChange([...value, newItemDraft(null, category)])}
          />
        </div>
      ) : kind === "reviews" ? (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={full}
            onClick={() => onChange([...value, newItemDraft()])}
          >
            Add review
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-ink-secondary">
            {kind === "drops" ? "Add a drop from Catalogue → Products" : "Add from Catalogue → Products"}
          </p>
          <ProductPicker
            chosenIds={chosenIds}
            canAdd={!full}
            onPick={(product) => onChange([...value, newItemDraft(product)])}
          />
          {kind === "drops" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              disabled={full}
              onClick={() => onChange([...value, newItemDraft()])}
            >
              Add a release that isn&rsquo;t in the catalogue yet
            </Button>
          )}
        </div>
      )}

      <FieldError>{errors.items?.[0]}</FieldError>
    </fieldset>
  );
}

function ItemCard({
  kind,
  item,
  index,
  count,
  errors,
  onChange,
  onMove,
  onRemove,
}: {
  kind: SectionItemKind;
  item: ItemDraft;
  index: number;
  count: number;
  errors: Record<string, string[] | undefined>;
  onChange: (next: ItemDraft) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const { input } = item;
  const error = (field: ItemField) => errors[itemErrorKey(index, field)]?.[0];
  const set = <K extends keyof SectionItemFormInput>(key: K, next: SectionItemFormInput[K]) =>
    onChange({ ...item, input: { ...input, [key]: next } });

  const name =
    item.category?.name ??
    item.product?.name ??
    (kind === "reviews" ? input.author : input.title) ??
    (kind === "reviews" ? "New review" : "New release");
  const thumbnail = item.category ?? item.product;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {thumbnail && (
          <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-surface-2">
            {thumbnail.imageUrl && (
              <Image src={thumbnail.imageUrl} alt="" fill sizes="40px" className="object-contain" unoptimized />
            )}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{name}</span>
        {thumbnail && !thumbnail.onStorefront && (
          <Badge variant="warn" className="px-2 py-1 text-[0.625rem]">
            Not on storefront
          </Badge>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={input.visible}
            onChange={(event) => set("visible", event.target.checked)}
          />
          Visible
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label={`Move ${name} up`}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          aria-label={`Move ${name} down`}
        >
          ↓
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${name}`}>
          ×
        </Button>
      </div>

      <FieldError>{error("productId")}</FieldError>
      <FieldError>{error("categoryId")}</FieldError>

      {kind === "categories" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${id}-title`}
              label="Title (optional)"
              hint="Leave empty to use the category's name."
              error={error("title")}
            >
              <Input
                id={`${id}-title`}
                value={input.title ?? ""}
                maxLength={ITEM_TEXT_LIMITS.title}
                className="h-11"
                onChange={(event) => set("title", event.target.value || null)}
              />
            </Field>
            <Field
              id={`${id}-cta-href`}
              label="Link (optional)"
              hint="Leave empty to open the category's page."
              error={error("ctaHref")}
            >
              <Input
                id={`${id}-cta-href`}
                value={input.ctaHref ?? ""}
                maxLength={ITEM_TEXT_LIMITS.ctaHref}
                className="h-11"
                onChange={(event) => set("ctaHref", event.target.value || null)}
              />
            </Field>
          </div>

          <ImageField
            label="Image (optional, uses the category's image without one)"
            value={input.imageId}
            previewUrl={item.imageUrl}
            error={error("imageId")}
            onChange={(imageId, url) => onChange({ ...item, input: { ...input, imageId }, imageUrl: url })}
          />
        </>
      )}

      {kind === "drops" && (
        <>
          <Field
            id={`${id}-title`}
            label={item.product ? "Title (optional)" : "Title"}
            hint={item.product ? "Leave empty to use the product's name." : undefined}
            error={error("title")}
          >
            <Input
              id={`${id}-title`}
              value={input.title ?? ""}
              maxLength={ITEM_TEXT_LIMITS.title}
              className="h-11"
              onChange={(event) => set("title", event.target.value || null)}
            />
          </Field>

          <Field
            id={`${id}-release`}
            label={`Release date and time, ${STORE_TIME_ZONE_LABEL} (${item.product ? "optional" : "required"})`}
            hint={
              (input.releaseAt ? `Opens ${formatStoreDateTime(input.releaseAt)}. ` : "") +
              (item.product
                ? "Until then the card counts down and offers the waitlist."
                : "The card shows until then, then leaves the page.")
            }
            error={error("releaseAt")}
          >
            <Input
              id={`${id}-release`}
              type="datetime-local"
              value={toStoreDateTimeInput(input.releaseAt)}
              className="h-11"
              onChange={(event) => set("releaseAt", fromStoreDateTimeInput(event.target.value))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-cta-label`} label="Button label (optional)" error={error("ctaLabel")}>
              <Input
                id={`${id}-cta-label`}
                value={input.ctaLabel ?? ""}
                maxLength={ITEM_TEXT_LIMITS.ctaLabel}
                className="h-11"
                onChange={(event) => set("ctaLabel", event.target.value || null)}
              />
            </Field>
            <Field
              id={`${id}-cta-href`}
              label="Button link (optional)"
              hint="Replaces the card's own action."
              error={error("ctaHref")}
            >
              <Input
                id={`${id}-cta-href`}
                value={input.ctaHref ?? ""}
                maxLength={ITEM_TEXT_LIMITS.ctaHref}
                className="h-11"
                onChange={(event) => set("ctaHref", event.target.value || null)}
              />
            </Field>
          </div>

          {/* A product brings its own picture; only a release without one needs an upload. */}
          {!input.productId && (
            <ImageField
              label="Image"
              value={input.imageId}
              previewUrl={item.imageUrl}
              error={error("imageId")}
              onChange={(imageId, url) =>
                onChange({ ...item, input: { ...input, imageId }, imageUrl: url })
              }
            />
          )}
        </>
      )}

      {kind === "reviews" && (
        <>
          <Field id={`${id}-body`} label="Review" error={error("body")}>
            <Textarea
              id={`${id}-body`}
              value={input.body ?? ""}
              maxLength={ITEM_TEXT_LIMITS.body}
              rows={3}
              onChange={(event) => set("body", event.target.value || null)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-author`} label="Customer" hint="As published, e.g. Arjun M." error={error("author")}>
              <Input
                id={`${id}-author`}
                value={input.author ?? ""}
                maxLength={ITEM_TEXT_LIMITS.author}
                className="h-11"
                onChange={(event) => set("author", event.target.value || null)}
              />
            </Field>
            <Field id={`${id}-product`} label="Product bought (optional)" error={error("title")}>
              <Input
                id={`${id}-product`}
                value={input.title ?? ""}
                maxLength={ITEM_TEXT_LIMITS.title}
                className="h-11"
                onChange={(event) => set("title", event.target.value || null)}
              />
            </Field>
          </div>

          <Field id={`${id}-rating`} label="Rating (optional)" error={error("rating")}>
            <Select
              id={`${id}-rating`}
              value={input.rating === null ? "" : String(input.rating)}
              className="h-11"
              onChange={(event) => set("rating", event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((stars) => (
                <option key={stars} value={stars}>
                  {stars} out of 5
                </option>
              ))}
            </Select>
          </Field>

          <ImageField
            label="Customer photo (optional)"
            value={input.imageId}
            previewUrl={item.imageUrl}
            error={error("imageId")}
            onChange={(imageId, url) => onChange({ ...item, input: { ...input, imageId }, imageUrl: url })}
          />
        </>
      )}
    </div>
  );
}
