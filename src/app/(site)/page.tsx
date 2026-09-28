import { HomepageSection } from "@/components/home/homepage-section";
import { FEATURED_PRODUCTS_LIMIT } from "@/lib/constants";
import { toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";
import { listNewestShopProducts } from "@/services/catalogue.service";
import { getPublishedHomepage } from "@/services/homepage.service";

export const dynamic = "force-dynamic";

/**
 * The homepage is whatever was last published through the homepage API — see
 * docs/HOMEPAGE-CMS.md. The CMS decides which sections show, in what order,
 * with what copy; product data comes from the catalogue. There is no fallback
 * copy here: an unpublished database renders the header and footer only, and
 * the seed publishes the defaults.
 */
export default async function Home() {
  const [sections, faqPolicy, products] = await Promise.all([
    getPublishedHomepage(),
    getPublishedPolicy("faq"),
    listNewestShopProducts(FEATURED_PRODUCTS_LIMIT),
  ]);
  const faqs = toFaqEntries(faqPolicy);

  return (
    <>
      {sections.map((section) => (
        <HomepageSection key={section.id} section={section} faqs={faqs} products={products} />
      ))}
    </>
  );
}
