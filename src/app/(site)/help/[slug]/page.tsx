import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideBody } from "@/components/help/guide-sections";
import { HelpShell } from "@/components/help/help-shell";
import { HELP_PAGE_PATH } from "@/lib/constants";
import { pageMetadata } from "@/lib/seo";
import { getGuide } from "@/services/help-guide.service";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide("customer", slug);
  if (!guide) return { title: "Not found" };

  return pageMetadata({ title: guide.title, description: guide.summary, path: `${HELP_PAGE_PATH}/${guide.slug}` });
}

export default async function HelpGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide("customer", slug);
  if (!guide) notFound();

  return (
    <HelpShell title={guide.title} lede={guide.summary}>
      <GuideBody guide={guide} stickyClassName="lg:top-(--spacing-page-top-lg)" />
    </HelpShell>
  );
}
