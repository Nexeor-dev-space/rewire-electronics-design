import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ClaimDetail } from "@/components/admin/warranty/claim-detail";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { claimNumberValidator } from "@/validators/warranty.validator";

interface Props {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const parsed = claimNumberValidator.safeParse(number);
  return { title: parsed.success ? `${parsed.data} — Warranty & Claims` : "Not found" };
}

export default async function ClaimDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.warranty)) {
    return (
      <AdminPage title="Warranty & Claims">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Warranty & Claims." />
      </AdminPage>
    );
  }

  const { number } = await params;
  const parsed = claimNumberValidator.safeParse(number);
  if (!parsed.success) notFound();

  return <ClaimDetail number={parsed.data} />;
}
