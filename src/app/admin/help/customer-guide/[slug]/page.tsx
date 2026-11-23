import type { Metadata } from "next";
import { GuideRoute, guideTitle } from "@/components/admin/help/guide-routes";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: await guideTitle("customer", slug) };
}

export default async function CustomerGuidePage({ params }: Props) {
  const { slug } = await params;
  return <GuideRoute audience="customer" slug={slug} />;
}
