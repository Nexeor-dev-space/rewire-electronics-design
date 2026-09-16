import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import { SupportIntro } from "@/components/support/intro";
import { SupportContact } from "@/components/support/contact";

export const metadata: Metadata = {
  title: `Support — ${siteConfig.name}`,
  description:
    "Three ways to reach a person at Rewire Electronics, and the way in to warranty, shipping, returns and the questions a drop raises.",
};

export default function SupportPage() {
  return (
    <>
      <SupportIntro />
      <SupportContact />
    </>
  );
}
