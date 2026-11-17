import { ABOUT_PAGE_PATH } from "@/lib/constants";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { AboutIntro } from "@/components/about/intro";
import { AboutWhat } from "@/components/about/what";
import { AboutProcess } from "@/components/about/process";
import { AboutConditions } from "@/components/about/conditions";
import { AboutQuality } from "@/components/about/quality";
import { AboutWhy } from "@/components/about/why";
import { AboutSustainability } from "@/components/about/sustainability";
import { AboutCta } from "@/components/about/cta";
import { Process } from "@/components/home/process/process";
import { Faq } from "@/components/home/faq/faq";
import { faqHeading, toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";

export const metadata = pageMetadata({
  title: "About",
  description: `${siteConfig.name}. ${siteConfig.description} Learn how Rewire inspects, grades and warrants every device before it reaches you.`,
  path: ABOUT_PAGE_PATH,
});

/**
 * About Rewire — the company's own page, told in the same voice as the
 * homepage but from the inside. Every fact printed here is sourced from
 * a lib adapter (`site`, `standard`, `certification`, `assurances`,
 * `condition-explainer`); nothing is invented in the markup. Where the
 * source is silent — number of returns processed, tonnes diverted,
 * suppliers audited — the copy stays honest about that and leaves the
 * figure to arrive later, rather than putting a placeholder in a shape
 * that looks like a claim.
 */
export default async function AboutPage() {
  const faqPolicy = await getPublishedPolicy("faq");
  const faqs = toFaqEntries(faqPolicy);

  return (
    <>
      <AboutIntro />
      <AboutWhat />
      <AboutProcess />
      <AboutConditions />
      <AboutQuality />
      <AboutWhy />
      <AboutSustainability />
      {/* "How Every Drop Works" — the four-step drop flow (waitlist →
          reminder → purchase → delivery). Moved here from the homepage
          so the About page ends with the customer journey immediately
          before the closing CTA. */}
      <Process />
      {/* Moved here from the homepage. Omitted when there are no questions. */}
      {faqs.length > 0 && (
        <Faq faqs={faqs} heading={faqHeading(faqPolicy?.title ?? "")} lede={faqPolicy?.lede} />
      )}
      <AboutCta />
    </>
  );
}
