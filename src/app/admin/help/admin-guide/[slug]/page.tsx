import type { Metadata } from "next";
import { GuideRoute, guideTitle } from "@/components/admin/help/guide-routes";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: await guideTitle("admin", slug) };
}

export default async function AdminGuidePage({ params }: Props) {
  const { slug } = await params;
  return <GuideRoute audience="admin" slug={slug} />;
}
