import { HomepageSection } from "@/components/home/homepage-section";
import { FEATURED_PRODUCTS_LIMIT } from "@/lib/constants";
import { toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";
import { listNewestShopProducts } from "@/services/catalogue.service";
import type { PublishedSection } from "@/types/homepage";

/**
 * A list of homepage sections with the data they share: the FAQ policy's
 * entries and the catalogue's newest products. The homepage and the staff
 * preview both render through this, so the two can't drift.
 */
export async function HomepageSections({ sections }: { sections: PublishedSection[] }) {
  const [faqPolicy, products] = await Promise.all([
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
