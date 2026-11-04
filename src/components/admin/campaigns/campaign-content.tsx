import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";

interface CampaignContentProps {
  description: string;
  content: string;
  bannerUrl: string | null;
  imageUrls: string[];
  ctaLabel: string | null;
  ctaHref: string | null;
  releaseTitle: string | null;
}

/** The campaign's content, shared by the details page and the form's preview. */
export function CampaignContent({
  description,
  content,
  bannerUrl,
  imageUrls,
  ctaLabel,
  ctaHref,
  releaseTitle,
}: CampaignContentProps) {
  const isEmpty =
    !description && !content && !bannerUrl && imageUrls.length === 0 && !ctaLabel && !releaseTitle;

  if (isEmpty) return <p className="text-sm text-ink-muted">No content yet.</p>;

  return (
    <div className="flex flex-col gap-4">
      {bannerUrl && (
        <div className="relative aspect-[3/1] overflow-hidden rounded-lg bg-surface-2">
          <Image src={bannerUrl} alt="Campaign banner" fill sizes="(min-width: 1280px) 50vw, 100vw" className="object-cover" unoptimized />
        </div>
      )}

      {description && <p className="whitespace-pre-line text-sm text-ink">{description}</p>}
      {content && <p className="whitespace-pre-line text-sm text-ink-secondary">{content}</p>}

      {imageUrls.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {imageUrls.map((url, index) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
              <Image src={url} alt={`Campaign image ${index + 1}`} fill sizes="240px" className="object-contain p-2" unoptimized />
            </li>
          ))}
        </ul>
      )}

      {ctaLabel && (
        <div className="flex flex-wrap items-center gap-3">
          <span className={buttonVariants({ size: "sm" })}>{ctaLabel}</span>
          {ctaHref && <span className="break-all font-mono text-xs text-ink-muted">{ctaHref}</span>}
        </div>
      )}

      {releaseTitle && <p className="text-sm text-ink-secondary">Linked release: {releaseTitle}</p>}
    </div>
  );
}
