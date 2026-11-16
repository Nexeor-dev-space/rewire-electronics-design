import { notFound } from "next/navigation";
import { Faq } from "@/components/home/faq/faq";
import { policyMetadata } from "@/components/policy/policy-page";
import { faqHeading, toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";

export const generateMetadata = () => policyMetadata("faq");

export default async function FaqPage() {
  const policy = await getPublishedPolicy("faq");
  if (!policy) notFound();

  return (
    <Faq
      faqs={toFaqEntries(policy)}
      heading={faqHeading(policy.title)}
      lede={policy.lede}
      headingLevel="h1"
    />
  );
}
