import { notFound } from "next/navigation";
import { GuideIndex } from "@/components/admin/help/guide-index";
import { GuideView } from "@/components/admin/help/guide-view";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import type { GuideAudience } from "@/lib/user-guides/types";
import { getGuide, listGuides } from "@/services/help-guide.service";

/**
 * What the Help area's pages render. Every console user may read a guide, so
 * there is no module check here; Edit this guide shows only to those who may edit.
 */

export async function GuideIndexRoute({ audience }: { audience: GuideAudience }) {
  return <GuideIndex audience={audience} guides={await listGuides(audience)} />;
}

export async function GuideRoute({ audience, slug }: { audience: GuideAudience; slug: string }) {
  const guide = await getGuide(audience, slug);
  if (!guide) notFound();

  const session = await getSession();
  const canEdit = session ? hasPermission(session.user.permissions, PERMISSIONS.helpGuides, "EDIT") : false;

  return <GuideView guide={guide} canEdit={canEdit} />;
}

export async function guideTitle(audience: GuideAudience, slug: string): Promise<string> {
  return (await getGuide(audience, slug))?.title ?? "Not found";
}
