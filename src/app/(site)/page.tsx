import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Featured } from "@/components/home/featured/featured";
import { WhatYouHave } from "@/components/home/conditions/what-you-have";
import { Stories } from "@/components/home/stories/stories";
import { Faq } from "@/components/home/faq/faq";
import { Invitation } from "@/components/home/invitation/invitation";
import { toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";

export default async function Home() {
  const faqs = toFaqEntries(await getPublishedPolicy("faq"));

  return (
    <>
      <Hero />
      <UpcomingDrops />
      <Featured />
      <WhatYouHave />
      <Stories />
      {faqs.length > 0 && <Faq faqs={faqs} />}
      <Invitation />
    </>
  );
}
