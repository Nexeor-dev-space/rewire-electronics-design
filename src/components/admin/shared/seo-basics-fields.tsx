"use client";

import { useId } from "react";
import { ImageField } from "@/components/admin/shared/image-field";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SEO_DESCRIPTION_MAX_LENGTH, SEO_TITLE_MAX_LENGTH } from "@/lib/constants";

export const seoCounter = (value: string, max: number) => `${value.trim().length}/${max}`;

export interface DraftSeoBasics {
  seoTitle: string;
  metaDescription: string;
  ogImageId: string | null;
  ogImageUrl: string | null;
}

export function SeoBasicsFields({
  seo,
  onChange,
  fallback,
  imageLabel,
  description,
  errorAt,
}: {
  seo: DraftSeoBasics;
  onChange: (seo: DraftSeoBasics) => void;
  fallback: { title: string; description: string };
  imageLabel?: string;
  description?: string;
  errorAt?: (path: string) => string | undefined;
}) {
  const id = useId();
  const set = (patch: Partial<DraftSeoBasics>) => onChange({ ...seo, ...patch });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium text-ink">SEO and sharing</h3>
        <p className="mt-1 text-xs text-ink-muted">
          {description ??
            "Search result text and the preview card when the link is shared. Leave blank to use the defaults."}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${id}-seo-title`}
          label="SEO title"
          hint={`${seoCounter(seo.seoTitle, SEO_TITLE_MAX_LENGTH)} · Used exactly as written.`}
          error={errorAt?.("seoTitle")}
        >
          <Input
            id={`${id}-seo-title`}
            value={seo.seoTitle}
            placeholder={fallback.title}
            maxLength={SEO_TITLE_MAX_LENGTH}
            onChange={(event) => set({ seoTitle: event.target.value })}
            className="h-11"
          />
        </Field>

        <Field
          id={`${id}-meta-description`}
          label="Meta description"
          hint={seoCounter(seo.metaDescription, SEO_DESCRIPTION_MAX_LENGTH)}
          error={errorAt?.("metaDescription")}
        >
          <Textarea
            id={`${id}-meta-description`}
            value={seo.metaDescription}
            placeholder={fallback.description}
            maxLength={SEO_DESCRIPTION_MAX_LENGTH}
            onChange={(event) => set({ metaDescription: event.target.value })}
            className="min-h-24"
          />
        </Field>

        {imageLabel && (
          <div className="sm:col-span-2">
            <ImageField
              label={imageLabel}
              value={seo.ogImageId}
              previewUrl={seo.ogImageUrl}
              onChange={(ogImageId, ogImageUrl) => set({ ogImageId, ogImageUrl })}
              error={errorAt?.("ogImageId")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
