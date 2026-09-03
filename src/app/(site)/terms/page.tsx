import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { getLegalDocument } from "@/lib/legal";
import { siteConfig } from "@/lib/site";

const document = getLegalDocument("terms");

export const metadata: Metadata = {
  title: `${document.title} — ${siteConfig.name}`,
  description: document.lede,
};

/**
 * Terms & Conditions.
 *
 * One of the two routes the About menu names and the footer has always
 * linked to. Both links 404'd until this page existed. Content lives in
 * `lib/legal.ts`; the layout is shared with `/privacy`.
 */
export default function TermsPage() {
  return <LegalDocument document={document} />;
}
