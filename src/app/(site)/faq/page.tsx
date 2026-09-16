import { notFound } from "next/navigation";
import { Faq } from "@/components/home/faq/faq";
import { policyMetadata } from "@/components/policy/policy-page";
import { toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";

export const generateMetadata = () => policyMetadata("faq");

export default async function FaqPage() {
  const policy = await getPublishedPolicy("faq");
  if (!policy) notFound();

  const title = policy.title.trim();
  const split = title.lastIndexOf(" ");
  const heading: [string, string] =
    split === -1 ? [title, ""] : [title.slice(0, split), title.slice(split + 1)];

  return (
    <Faq
      faqs={toFaqEntries(policy)}
      heading={heading}
      lede={policy.lede}
      headingLevel="h1"
    />
  );
}
