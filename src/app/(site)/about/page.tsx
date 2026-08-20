import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { AboutIntro } from "@/components/about/intro";
import { AboutWhat } from "@/components/about/what";
import { AboutProcess } from "@/components/about/process";
import { AboutConditions } from "@/components/about/conditions";
import { AboutQuality } from "@/components/about/quality";
import { AboutWhy } from "@/components/about/why";
import { AboutSustainability } from "@/components/about/sustainability";
import { AboutCta } from "@/components/about/cta";

export const metadata: Metadata = {
  title: `About — ${siteConfig.name}`,
  description:
    `${siteConfig.name}. ${siteConfig.description} Learn how Rewire inspects, grades and warrants every device before it reaches you.`,
};

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
export default function AboutPage() {
  return (
    <>
      <AboutIntro />
      <AboutWhat />
      <AboutProcess />
      <AboutConditions />
      <AboutQuality />
      <AboutWhy />
      <AboutSustainability />
      <AboutCta />
    </>
  );
}
