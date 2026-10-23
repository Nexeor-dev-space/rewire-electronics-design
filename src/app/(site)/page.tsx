import { HomepageSections } from "@/components/home/homepage-sections";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { getHomepageSeo, getPublishedHomepage } from "@/services/homepage.service";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const seo = await getHomepageSeo();
  return pageMetadata({
    title: seo.seoTitle ?? `${siteConfig.name} — ${siteConfig.tagline}`,
    absoluteTitle: true,
    description: seo.metaDescription ?? siteConfig.description,
    path: "/",
    image: seo.ogImageUrl ?? undefined,
  });
}

/**
 * The homepage is whatever was last published through the homepage API — see
 * docs/HOMEPAGE-CMS.md. The CMS decides which sections show, in what order,
 * with what copy; product data comes from the catalogue. There is no fallback
 * copy here: an unpublished database renders the header and footer only, and
 * the seed publishes the defaults.
 */
export default async function Home() {
  return <HomepageSections sections={await getPublishedHomepage()} />;
}
