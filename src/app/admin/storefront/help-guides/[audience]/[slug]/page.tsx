import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { GuideEditor } from "@/components/admin/help/guide-editor";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { isGuideAudience } from "@/lib/user-guides/catalogue";
import { getGuide } from "@/services/help-guide.service";

interface Props {
  params: Promise<{ audience: string; slug: string }>;
}

export const metadata: Metadata = { title: "Edit guide" };

export default async function HelpGuideEditorPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.helpGuides, "EDIT")) {
    return (
      <AdminPage title="Help Guides">
        <AdminEmptyState title="Access denied" description="Your role can't edit help guides." />
      </AdminPage>
    );
  }

  const { audience, slug } = await params;
  if (!isGuideAudience(audience)) notFound();

  const guide = await getGuide(audience, slug);
  if (!guide) notFound();

  return (
    <AdminPage title={guide.title} description="Change the wording, screenshots and recording. Nothing changes until you save.">
      <GuideEditor key={`${audience}:${slug}`} guide={guide} />
    </AdminPage>
  );
}
