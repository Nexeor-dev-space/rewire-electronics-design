import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { WarrantyDetail } from "@/components/admin/warranty/warranty-detail";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { warrantyIdParamsSchema } from "@/validators/warranty.validator";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Warranty — Warranty & Claims" };

export default async function WarrantyDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.warranty)) {
    return (
      <AdminPage title="Warranty & Claims">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Warranty & Claims." />
      </AdminPage>
    );
  }

  const parsed = warrantyIdParamsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  return <WarrantyDetail id={parsed.data.id} />;
}
