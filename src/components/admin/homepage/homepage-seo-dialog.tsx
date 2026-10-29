"use client";

import { useState, type FormEvent } from "react";
import { SeoBasicsFields, type DraftSeoBasics } from "@/components/admin/shared/seo-basics-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetHomepageSeo, useUpdateHomepageSeo } from "@/hooks/use-homepage";
import { apiFieldErrors } from "@/lib/api/api-client";
import { siteConfig } from "@/lib/site";
import type { HomepageSeo } from "@/types/homepage";

export function HomepageSeoDialog({ onClose }: { onClose: () => void }) {
  const seo = useGetHomepageSeo();

  return (
    <Dialog
      open
      onClose={onClose}
      title="Homepage SEO and sharing"
      description="Goes live as soon as you save. It is not part of the draft."
    >
      {seo.isPending ? (
        <DialogBody>
          <Skeleton className="h-40 w-full" />
        </DialogBody>
      ) : seo.isError ? (
        <DialogBody>
          <p role="alert" className="text-sm text-danger">
            {seo.error.message}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => seo.refetch()}>
            Try again
          </Button>
        </DialogBody>
      ) : (
        <HomepageSeoForm initial={seo.data} onClose={onClose} />
      )}
    </Dialog>
  );
}

function HomepageSeoForm({ initial, onClose }: { initial: HomepageSeo; onClose: () => void }) {
  const update = useUpdateHomepageSeo();
  const [draft, setDraft] = useState<DraftSeoBasics>({
    seoTitle: initial.seoTitle ?? "",
    metaDescription: initial.metaDescription ?? "",
    ogImageId: initial.ogImageId,
    ogImageUrl: initial.ogImageUrl,
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    update.mutate(
      { seoTitle: draft.seoTitle, metaDescription: draft.metaDescription, ogImageId: draft.ogImageId },
      {
        onSuccess: () => onClose(),
        onError: (error: Error) => setErrors(apiFieldErrors(error)),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <SeoBasicsFields
          seo={draft}
          onChange={setDraft}
          fallback={{ title: `${siteConfig.name} — ${siteConfig.tagline}`, description: siteConfig.description }}
          imageLabel="Share image (OG), ideally 1200 × 630. Defaults to the site image."
          errorAt={(field) => errors[field]?.[0]}
        />
      </DialogBody>

      <DialogFooter>
        {update.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {update.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={update.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
