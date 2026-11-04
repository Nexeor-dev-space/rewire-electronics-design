import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/product/detail/breadcrumb";
import { NotifyMeButton } from "@/components/releases/notify-me-button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Countdown } from "@/components/ui/countdown";
import { conditionLabel, gradeLabel } from "@/lib/catalogue";
import { RELEASES_PAGE_PATH, SEO_DESCRIPTION_MAX_LENGTH } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { RELEASE_STATUS_LABELS, releaseHref, type ReleaseStatus } from "@/lib/releases";
import { clip, pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getStorefrontRelease } from "@/services/release-storefront.service";
import type { StorefrontReleaseProduct, StorefrontReleaseVariant } from "@/types/storefront-release";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

const STATUS_BADGE = {
  DRAFT: "outline",
  UPCOMING: "default",
  LIVE: "live",
  SOLD_OUT: "soldOut",
  COMPLETED: "outline",
} as const satisfies Record<ReleaseStatus, BadgeProps["variant"]>;

const getRelease = cache(getStorefrontRelease);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const release = await getRelease((await params).slug);
  if (!release) return { title: "Release not found" };
  return pageMetadata({
    title: release.edition ? `${release.title}, ${release.edition}` : release.title,
    description: clip(release.description || siteConfig.description, SEO_DESCRIPTION_MAX_LENGTH),
    path: releaseHref(release.slug),
    image: release.image?.url,
  });
}

export default async function ReleasePage({ params }: Params) {
  const release = await getRelease((await params).slug);
  if (!release) notFound();

  const upcoming = release.status === "UPCOMING";
  const countdownTarget = upcoming ? release.startsAt : release.status === "LIVE" ? release.endsAt : null;

  return (
    <div className="pb-(--spacing-section) pt-24 lg:pt-32">
      <Container width="wide">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Releases", href: RELEASES_PAGE_PATH },
            { label: release.title },
          ]}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-10">
          <header className="lg:col-span-7">
            {release.edition && <p className="eyebrow">{release.edition}</p>}
            <h1 className="mt-3 text-display-lg font-light text-ink">{release.title}</h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge variant={STATUS_BADGE[release.status]}>{RELEASE_STATUS_LABELS[release.status]}</Badge>
              <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-secondary">
                {upcoming ? "Opens" : "Opened"} {formatStoreDateTime(release.startsAt)}
              </p>
            </div>
            {release.description && (
              <p className="mt-8 max-w-2xl whitespace-pre-line text-base leading-relaxed text-ink-secondary">
                {release.description}
              </p>
            )}
          </header>

          <aside className="lg:col-span-5 lg:col-start-8">
            <div className="rounded-xl border border-line bg-surface p-6 shadow-(--shadow-soft) sm:p-8">
              {countdownTarget && (
                <div className="border-b border-line pb-6">
                  <p className="eyebrow">{upcoming ? "Opens in" : "Closes in"}</p>
                  <Countdown
                    compact
                    target={countdownTarget}
                    label={`${release.title} ${upcoming ? "opens" : "closes"} in`}
                    className="mt-3 block text-(length:--text-display-sm) leading-none text-ink"
                  />
                </div>
              )}
              <dl className="divide-y divide-line">
                <Fact label="Opens">{formatStoreDateTime(release.startsAt)}</Fact>
                {release.endsAt && <Fact label="Closes">{formatStoreDateTime(release.endsAt)}</Fact>}
                <Fact label="Limit">Up to {release.maxPerCustomer} per customer</Fact>
              </dl>
              <NotifyMeButton release={{ slug: release.slug, title: release.title }} className="mt-6 w-full" />
            </div>
          </aside>
        </div>

        <section aria-labelledby="release-products-heading" className="pt-(--spacing-section-sm)">
          <h2 id="release-products-heading" className="eyebrow">
            In this release
          </h2>
          <ul className="mt-8 grid gap-x-6 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
            {release.products.map((product) => (
              <ReleaseProduct key={product.id} product={product} />
            ))}
          </ul>
        </section>
      </Container>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">{label}</dt>
      <dd className="text-right text-[0.875rem] text-ink">{children}</dd>
    </div>
  );
}

function ReleaseProduct({ product }: { product: StorefrontReleaseProduct }) {
  const image = product.images[0];
  return (
    <li className="flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-plate">
        {image && (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 92vw, (max-width: 1280px) 46vw, 30vw"
            className="object-cover mix-blend-multiply"
          />
        )}
      </div>
      <h3 className="mt-5 text-[1.0625rem] font-medium leading-tight tracking-[-0.015em] text-ink">
        {product.name}
      </h3>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {product.variants.map((variant) => (
          <VariantRow key={variant.id} variant={variant} />
        ))}
      </ul>
    </li>
  );
}

function VariantRow({ variant }: { variant: StorefrontReleaseVariant }) {
  const soldOut = variant.available === 0;
  const label = [
    variant.storage,
    variant.colour,
    conditionLabel(variant.condition),
    variant.grade && gradeLabel(variant.grade),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <span className="min-w-0 text-[0.8125rem] text-ink-secondary">{label}</span>
      <span className="flex shrink-0 items-baseline gap-2.5">
        <span
          className={cn(
            "text-[0.9375rem] font-medium tabular-nums",
            soldOut ? "text-ink-muted line-through" : "text-ink",
          )}
        >
          {formatMoney(variant.price)}
        </span>
        {variant.compareAtPrice !== null && variant.compareAtPrice > variant.price && !soldOut && (
          <>
            <span className="sr-only">was </span>
            <s className="font-mono text-[0.75rem] tabular-nums text-ink-muted">
              {formatMoney(variant.compareAtPrice)}
            </s>
          </>
        )}
        <span
          className={cn(
            "font-mono text-[0.625rem] uppercase tracking-[0.16em]",
            soldOut ? "text-ink-muted" : "text-ink-secondary",
          )}
        >
          {soldOut ? "Sold out" : `${variant.available} left`}
        </span>
      </span>
    </li>
  );
}
