import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { getLegalDocument } from "@/lib/legal";
import { siteConfig } from "@/lib/site";

const document = getLegalDocument("privacy");

export const metadata: Metadata = {
  title: `${document.title} — ${siteConfig.name}`,
  description: document.lede,
};

/**
 * Privacy Policy.
 *
 * The other route the About menu names and the footer has always linked
 * to. Content lives in `lib/legal.ts`; the layout is shared with
 * `/terms`.
 */
export default function PrivacyPage() {
  return <LegalDocument document={document} />;
}
