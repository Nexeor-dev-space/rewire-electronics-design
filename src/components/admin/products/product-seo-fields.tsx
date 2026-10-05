"use client";

import { useId, useState } from "react";
import { ImageField } from "@/components/admin/shared/image-field";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import {
  CANONICAL_URL_MAX_LENGTH,
  OG_DESCRIPTION_MAX_LENGTH,
  OG_TITLE_MAX_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_KEYWORDS_MAX,
  SEO_TITLE_MAX_LENGTH,
} from "@/lib/constants";
import type { ProductDetail } from "@/types/product";

/**
 * The product form's SEO section. Every field is optional: the placeholder
 * shows what the storefront uses when it's left empty (`productSeo`).
 */

export interface DraftSeo {
  seoTitle: string;
  metaDescription: string;
  /** Comma separated in the form, an array in the API. */
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageId: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string;
}

export function toDraftSeo(product?: ProductDetail): DraftSeo {
  return {
    seoTitle: product?.seoTitle ?? "",
    metaDescription: product?.metaDescription ?? "",
    metaKeywords: product?.metaKeywords.join(", ") ?? "",
    ogTitle: product?.ogTitle ?? "",
    ogDescription: product?.ogDescription ?? "",
    ogImageId: product?.ogImageId ?? null,
    ogImageUrl: product?.ogImageUrl ?? null,
    canonicalUrl: product?.canonicalUrl ?? "",
  };
}

/** The API shape; blanks become null and the validator trims. */
export function seoInput(seo: DraftSeo) {
  return {
    seoTitle: seo.seoTitle,
    metaDescription: seo.metaDescription,
    metaKeywords: seo.metaKeywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImageId: seo.ogImageId,
    canonicalUrl: seo.canonicalUrl,
  };
}

const counter = (value: string, max: number) => `${value.trim().length}/${max}`;

const SEO_FIELDS = ["seoTitle", "metaDescription", "metaKeywords", "ogTitle", "ogDescription", "ogImageId", "canonicalUrl"];

const hasValues = (seo: DraftSeo) =>
  Object.values(seoInput(seo)).some((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));

export function ProductSeoFields({
  seo,
  onChange,
  fallback,
  errorAt,
}: {
  seo: DraftSeo;
  onChange: (seo: DraftSeo) => void;
  /** What the storefront would use for an empty field. */
  fallback: { title: string; description: string; canonical: string };
  errorAt: (path: string) => string | undefined;
}) {
  const id = useId();
  // Starts open when the product already has SEO values, and opens itself on an error.
  const [expanded, setExpanded] = useState(() => hasValues(seo));
  const open = expanded || SEO_FIELDS.some((field) => errorAt(field) ?? errorAt(`${field}.0`));
  const set = (patch: Partial<DraftSeo>) => onChange({ ...seo, ...patch });
  const ogTitleFallback = seo.seoTitle.trim() || fallback.title;
  const ogDescriptionFallback = seo.metaDescription.trim() || fallback.description;

  return (
    <section className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setExpanded(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block text-sm font-medium text-ink">SEO and sharing</span>
          <span className="block text-xs text-ink-muted">
            Search result text and the preview card when the link is shared. Leave blank to use the defaults.
          </span>
        </span>
        <span aria-hidden className="text-ink-muted">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="grid gap-5 border-t border-line px-5 py-5 sm:grid-cols-2">
          <Field
            id={`${id}-seo-title`}
            label="SEO title"
            hint={`${counter(seo.seoTitle, SEO_TITLE_MAX_LENGTH)} · Used exactly as written.`}
            error={errorAt("seoTitle")}
          >
            <Input
              id={`${id}-seo-title`}
              value={seo.seoTitle}
              placeholder={fallback.title}
              onChange={(event) => set({ seoTitle: event.target.value })}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-og-title`}
            label="Share title (OG)"
            hint={counter(seo.ogTitle, OG_TITLE_MAX_LENGTH)}
            error={errorAt("ogTitle")}
          >
            <Input
              id={`${id}-og-title`}
              value={seo.ogTitle}
              placeholder={ogTitleFallback}
              onChange={(event) => set({ ogTitle: event.target.value })}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-meta-description`}
            label="Meta description"
            hint={counter(seo.metaDescription, SEO_DESCRIPTION_MAX_LENGTH)}
            error={errorAt("metaDescription")}
          >
            <Textarea
              id={`${id}-meta-description`}
              value={seo.metaDescription}
              placeholder={fallback.description}
              onChange={(event) => set({ metaDescription: event.target.value })}
              className="min-h-24"
            />
          </Field>

          <Field
            id={`${id}-og-description`}
            label="Share description (OG)"
            hint={counter(seo.ogDescription, OG_DESCRIPTION_MAX_LENGTH)}
            error={errorAt("ogDescription")}
          >
            <Textarea
              id={`${id}-og-description`}
              value={seo.ogDescription}
              placeholder={ogDescriptionFallback}
              onChange={(event) => set({ ogDescription: event.target.value })}
              className="min-h-24"
            />
          </Field>

          <Field
            id={`${id}-keywords`}
            label="Meta keywords"
            hint={`Comma separated, up to ${SEO_KEYWORDS_MAX}. Most search engines ignore these.`}
            error={errorAt("metaKeywords") ?? errorAt("metaKeywords.0")}
          >
            <Input
              id={`${id}-keywords`}
              value={seo.metaKeywords}
              onChange={(event) => set({ metaKeywords: event.target.value })}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-canonical`}
            label="Canonical URL"
            hint={`A path or a full https:// address, up to ${CANONICAL_URL_MAX_LENGTH} characters.`}
            error={errorAt("canonicalUrl")}
          >
            <Input
              id={`${id}-canonical`}
              value={seo.canonicalUrl}
              placeholder={fallback.canonical}
              onChange={(event) => set({ canonicalUrl: event.target.value })}
              className="h-11"
            />
          </Field>

          <div className="sm:col-span-2">
            <ImageField
              label="Share image (OG), ideally 1200 × 630. Defaults to the first product image."
              value={seo.ogImageId}
              previewUrl={seo.ogImageUrl}
              onChange={(ogImageId, ogImageUrl) => set({ ogImageId, ogImageUrl })}
              error={errorAt("ogImageId")}
            />
          </div>
        </div>
      )}
    </section>
  );
}
