import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { ReturnDetail } from "@/components/admin/returns/return-detail";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { returnNumberValidator } from "@/validators/return.validator";

interface Props {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const parsed = returnNumberValidator.safeParse(number);
  return { title: parsed.success ? `${parsed.data} — Returns` : "Not found" };
}

export default async function ReturnDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.returns)) {
    return (
      <AdminPage title="Returns">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Returns." />
      </AdminPage>
    );
  }

  const { number } = await params;
  const parsed = returnNumberValidator.safeParse(number);
  if (!parsed.success) notFound();

  return <ReturnDetail number={parsed.data} />;
}
