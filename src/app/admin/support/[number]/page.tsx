import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { SupportDetail } from "@/components/admin/support/support-detail";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { ticketNumberValidator } from "@/validators/support.validator";

interface Props {
  params: Promise<{ number: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const parsed = ticketNumberValidator.safeParse(number);
  return { title: parsed.success ? `${parsed.data} — Support Tickets` : "Not found" };
}

export default async function SupportTicketPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.permissions, PERMISSIONS.support)) {
    return (
      <AdminPage title="Support Tickets">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Support Tickets." />
      </AdminPage>
    );
  }

  const { number } = await params;
  const parsed = ticketNumberValidator.safeParse(number);
  if (!parsed.success) notFound();

  return <SupportDetail number={parsed.data} />;
}
