import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { HomepageBuilder } from "@/components/admin/homepage/homepage-builder";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { HOMEPAGE_SECTION_PARAM } from "@/lib/constants";
import { ADDABLE_SECTION_TYPES } from "@/lib/homepage-sections";

export const metadata: Metadata = { title: "Homepage Builder" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomepageBuilderPage({ searchParams }: Props) {
  const requested = (await searchParams)[HOMEPAGE_SECTION_PARAM];
  const openType = ADDABLE_SECTION_TYPES.find((type) => type === requested);
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.homepage)) {
    return (
      <AdminPage title="Homepage Builder">
        <AdminEmptyState
          title="Access denied"
          description="Your role doesn't include the Homepage Builder."
        />
      </AdminPage>
    );
  }

  return <HomepageBuilder openType={openType} />;
}
