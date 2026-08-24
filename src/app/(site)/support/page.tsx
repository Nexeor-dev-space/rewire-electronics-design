import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { SupportIntro } from "@/components/support/intro";
import { SupportPolicies } from "@/components/support/policies";
import { SupportContact } from "@/components/support/contact";
import { Faq } from "@/components/home/faq/faq";

export const metadata: Metadata = {
  title: `Support — ${siteConfig.name}`,
  description:
    "Warranty, shipping and returns in full, the questions a drop raises, and three ways to reach a person at Rewire Electronics.",
};

/**
 * Support — one page, four anchors, no sub-routes.
 *
 * The Support menu lists six destinations (FAQ, Shipping, Returns,
 * Warranty, Track Order, Contact) and every one of them is a section
 * here rather than a page of its own. That is a deliberate call about a
 * shape, not a shortcut: five of the six are two paragraphs of policy,
 * and a two-paragraph page behind a nav click is worse than a scroll —
 * it costs a navigation to read less than fits on a phone screen, and
 * it hides the neighbouring policy a reader usually needs next
 * (returns and shipping are the same question asked twice). The
 * exception, Track Order, is not editorial at all; it belongs to the
 * account area and the menu points there directly.
 *
 * `lib/support.ts` owns the anchors. The menu's hrefs are generated
 * from the same list this page renders, so a section cannot be renamed
 * into a dead link from the nav.
 *
 * The FAQ is the homepage's section reused verbatim, not a copy. It
 * already renders all twelve questions from `lib/faqs.ts` and emits
 * FAQPage JSON-LD; a second implementation would be a second answer to
 * the same question the day one of them was edited.
 *
 * Reading order is answer-first: what we promise, then the questions,
 * then — only for a reader neither has helped — a person. Contact is
 * last on purpose.
 */
export default function SupportPage() {
  return (
    <>
      <SupportIntro />
      <SupportPolicies />

      {/* The reused section renders its own `<section>`, so the anchor
          and its header offset live on a wrapper rather than being
          patched into a component two other pages share. */}
      <div id="faq" className="scroll-mt-28">
        <Faq />
      </div>

      <SupportContact />
    </>
  );
}
