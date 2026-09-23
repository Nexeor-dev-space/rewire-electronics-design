import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Featured } from "@/components/home/featured/featured";
import { WhatYouHave } from "@/components/home/conditions/what-you-have";
import { Stories } from "@/components/home/stories/stories";
import { Faq } from "@/components/home/faq/faq";
import { Invitation } from "@/components/home/invitation/invitation";
import { FEATURED_PRODUCTS_LIMIT } from "@/lib/constants";
import { toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";
import { listNewestShopProducts } from "@/services/catalogue.service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [faqPolicy, featured] = await Promise.all([
    getPublishedPolicy("faq"),
    listNewestShopProducts(FEATURED_PRODUCTS_LIMIT),
  ]);
  const faqs = toFaqEntries(faqPolicy);

  return (
    <>
      <Hero />
      <UpcomingDrops />
      {featured.length > 0 && <Featured products={featured} />}
      <WhatYouHave />
      <Stories />
      {faqs.length > 0 && <Faq faqs={faqs} />}
      <Invitation />
    </>
  );
}
