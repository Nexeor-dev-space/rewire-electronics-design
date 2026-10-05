import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { PolicyEditor } from "@/components/admin/policy/policy-editor";
import { getPolicy } from "@/lib/policies";
import { POLICY_ROUTES, isPolicySlug } from "@/lib/policy-types";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicySlug(slug)) return { title: "Not found" };

  const policy = await getPolicy(slug);
  return { title: policy ? `${policy.title} — Policies` : "Not found" };
}

export default async function PolicyEditorPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  const { permissions } = session.user;
  if (!hasPermission(permissions, PERMISSIONS.content, "EDIT")) {
    return (
      <AdminPage title="Content & Policies">
        <AdminEmptyState title="Access denied" description="Your role can't edit policies." />
      </AdminPage>
    );
  }

  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();

  const policy = await getPolicy(slug);
  if (!policy) notFound();

  return (
    <AdminPage
      title={policy.title}
      description="Section titles sit on the left of the storefront page and their content on the right. Drag a section to reorder it."
      actions={
        <Link
          href={POLICY_ROUTES[slug]}
          target="_blank"
          rel="noopener"
          className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
        >
          View page
        </Link>
      }
    >
      <PolicyEditor
        policy={policy}
        canPublish={hasPermission(permissions, PERMISSIONS.content, "PUBLISH")}
      />
    </AdminPage>
  );
}
