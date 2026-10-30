import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { WarrantyEdit } from "@/components/admin/warranty/warranty-edit";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { warrantyIdParamsSchema } from "@/validators/warranty.validator";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit warranty — Warranty & Claims" };

export default async function WarrantyEditPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.warranty, "EDIT")) {
    return (
      <AdminPage title="Edit warranty">
        <AdminEmptyState
          title="Access denied"
          description="Your role can view warranties but not change them."
        />
      </AdminPage>
    );
  }

  const parsed = warrantyIdParamsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  return <WarrantyEdit id={parsed.data.id} />;
}
