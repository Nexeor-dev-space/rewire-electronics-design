"use client";

import { useId, type Dispatch, type SetStateAction } from "react";
import { ImageField } from "@/components/admin/shared/image-field";
import { Section } from "@/components/admin/shared/detail-section";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import {
  CAMPAIGN_CONTENT_MAX_LENGTH,
  CAMPAIGN_CTA_HREF_MAX_LENGTH,
  CAMPAIGN_CTA_LABEL_MAX_LENGTH,
  MAX_CAMPAIGN_IMAGES,
} from "@/lib/constants";
import type { AdminCampaignImage } from "@/types/campaign";

export interface CampaignContentDraft {
  content: string;
  bannerImageId: string | null;
  bannerImageUrl: string | null;
  images: AdminCampaignImage[];
  ctaLabel: string;
  ctaHref: string;
  releaseId: string;
}

export function CampaignContentFields({
  draft,
  setDraft,
  releases,
  releasesError,
  error,
}: {
  draft: CampaignContentDraft;
  setDraft: Dispatch<SetStateAction<CampaignContentDraft>>;
  releases: { id: string; title: string }[];
  releasesError?: string;
  error: (field: string) => string | undefined;
}) {
  const id = useId();
  const slots: (AdminCampaignImage | null)[] =
    draft.images.length < MAX_CAMPAIGN_IMAGES ? [...draft.images, null] : draft.images;

  function change(patch: Partial<CampaignContentDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  /** `previous` is the image being replaced or removed; null when filling the empty slot. */
  function changeImage(previous: AdminCampaignImage | null, next: AdminCampaignImage | null) {
    setDraft((current) => {
      if (!previous) return next ? { ...current, images: [...current.images, next] } : current;
      return {
        ...current,
        images: next
          ? current.images.map((image) => (image.mediaId === previous.mediaId ? next : image))
          : current.images.filter((image) => image.mediaId !== previous.mediaId),
      };
    });
  }

  return (
    <Section title="Content">
      <div className="flex flex-col gap-5">
        <ImageField
          label="Banner"
          value={draft.bannerImageId}
          previewUrl={draft.bannerImageUrl}
          onChange={(bannerImageId, bannerImageUrl) => change({ bannerImageId, bannerImageUrl })}
          error={error("bannerImageId")}
        />

        <Field
          id={`${id}-content`}
          label="Promotional text"
          hint="Optional."
          error={error("content")}
        >
          <Textarea
            id={`${id}-content`}
            value={draft.content}
            maxLength={CAMPAIGN_CONTENT_MAX_LENGTH}
            rows={5}
            onChange={(event) => change({ content: event.target.value })}
            aria-invalid={error("content") ? true : undefined}
          />
        </Field>

        <div className="flex flex-col gap-3">
          <p className="eyebrow">
            Promotional images ({draft.images.length} of {MAX_CAMPAIGN_IMAGES})
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {slots.map((image, index) => (
              <ImageField
                key={image?.mediaId ?? "new"}
                label={`Image ${index + 1}`}
                value={image?.mediaId ?? null}
                previewUrl={image?.url ?? null}
                onChange={(mediaId, url) =>
                  changeImage(image, mediaId && url ? { mediaId, url } : null)
                }
              />
            ))}
          </div>
          <FieldError>{error("imageIds")}</FieldError>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-cta-label`} label="Button text" hint="Optional." error={error("ctaLabel")}>
            <Input
              id={`${id}-cta-label`}
              value={draft.ctaLabel}
              maxLength={CAMPAIGN_CTA_LABEL_MAX_LENGTH}
              onChange={(event) => change({ ctaLabel: event.target.value })}
              aria-invalid={error("ctaLabel") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-cta-href`}
            label="Button link"
            hint="A site path such as /collection, or an https:// link."
            error={error("ctaHref")}
          >
            <Input
              id={`${id}-cta-href`}
              value={draft.ctaHref}
              maxLength={CAMPAIGN_CTA_HREF_MAX_LENGTH}
              onChange={(event) => change({ ctaHref: event.target.value })}
              aria-invalid={error("ctaHref") ? true : undefined}
              className="h-11 font-mono"
            />
          </Field>

          <Field
            id={`${id}-release`}
            label="Linked release"
            hint="Optional."
            error={error("releaseId") ?? releasesError}
            className="sm:col-span-2"
          >
            <Select
              id={`${id}-release`}
              value={draft.releaseId}
              onChange={(event) => change({ releaseId: event.target.value })}
              aria-invalid={error("releaseId") ? true : undefined}
              className="h-11"
            >
              <option value="">No release</option>
              {releases.map((release) => (
                <option key={release.id} value={release.id}>
                  {release.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Section>
  );
}
