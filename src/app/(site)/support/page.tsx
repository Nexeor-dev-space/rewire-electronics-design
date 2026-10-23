import { SUPPORT_PAGE_PATH } from "@/lib/constants";
import { pageMetadata } from "@/lib/seo";
import { SupportIntro } from "@/components/support/intro";
import { SupportContact } from "@/components/support/contact";

export const metadata = pageMetadata({
  title: "Support",
  description:
    "Three ways to reach a person at Rewire Electronics, and the way in to warranty, shipping, returns and the questions a drop raises.",
  path: SUPPORT_PAGE_PATH,
});

export default function SupportPage() {
  return (
    <>
      <SupportIntro />
      <SupportContact />
    </>
  );
}
