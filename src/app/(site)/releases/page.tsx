import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { ReleaseGrid } from "@/components/releases/release-grid";
import { buttonVariants } from "@/components/ui/button";
import { RELEASES_PAGE_PATH, RELEASES_PAGE_SIZE } from "@/lib/constants";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { listStorefrontReleases, toPublishedDrop } from "@/services/release-storefront.service";
import { storefrontReleasesQuerySchema } from "@/validators/waitlist.validator";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  searchParams: Promise<SearchParams>;
}

const QUERY_KEYS = Object.keys(storefrontReleasesQuerySchema.shape);

function releasesQuery(params: SearchParams) {
  const parsed = storefrontReleasesQuerySchema.safeParse(params);
  return parsed.success ? parsed.data : { page: 1, pageSize: RELEASES_PAGE_SIZE };
}

function pageHref(page: number): string {
  return page > 1 ? `${RELEASES_PAGE_PATH}?page=${page}` : RELEASES_PAGE_PATH;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  return pageMetadata({
    title: "Releases",
    description:
      "Upcoming and live Rewire releases: numbered editions of certified-renewed devices. Join a waitlist to hear the moment one opens.",
    path: RELEASES_PAGE_PATH,
    noindex: QUERY_KEYS.some((key) => params[key] !== undefined),
  });
}

export default async function ReleasesPage({ searchParams }: PageProps) {
  const query = releasesQuery(await searchParams);
  const listing = await listStorefrontReleases(query);
  if (listing.items.length === 0 && query.page > 1) notFound();

  const pages = Math.ceil(listing.total / listing.pageSize);
  const drops = listing.items.map(toPublishedDrop);

  return (
    <div className="pb-(--spacing-section) pt-24 lg:pt-32">
      <Container width="wide">
        <header className="max-w-3xl">
          <p className="eyebrow">Releases</p>
          <h1 className="mt-3 text-display-lg font-light text-ink">Upcoming and live drops</h1>
          <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-secondary">
            Numbered editions, released on a schedule. Join a waitlist to hear the moment one opens.
          </p>
        </header>

        <div className="mt-12 lg:mt-16">
          {drops.length > 0 ? (
            <ReleaseGrid drops={drops} />
          ) : (
            <div className="flex flex-col items-start gap-5 border-t border-line py-24 lg:py-32">
              <p className="eyebrow">Nothing scheduled</p>
              <p className="max-w-md text-base leading-relaxed text-ink-secondary">
                There are no releases open or coming up right now. The shop is always open in the
                meantime.
              </p>
              <Link href={SHOP_INDEX_HREF} className={buttonVariants({ variant: "outline", size: "md" })}>
                Browse the shop
              </Link>
            </div>
          )}
        </div>

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2 lg:mt-20">
            <PageLink page={query.page - 1} disabled={query.page <= 1}>
              Previous
            </PageLink>
            <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
              {query.page} / {pages}
            </span>
            <PageLink page={query.page + 1} disabled={query.page >= pages}>
              Next
            </PageLink>
          </nav>
        )}
      </Container>
    </div>
  );
}

function PageLink({ page, disabled, children }: { page: number; disabled: boolean; children: ReactNode }) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(className, "pointer-events-none opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={pageHref(page)} className={className}>
      {children}
    </Link>
  );
}
