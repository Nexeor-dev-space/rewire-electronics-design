import type { Metadata } from "next";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { MessageLog } from "@/components/admin/messages/message-log";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Marketing Messages" };

export default async function MarketingMessagesPage() {
  const session = await getSession();
  if (!session) return null;

  if (!hasPermission(session.user.permissions, PERMISSIONS.messages)) {
    return (
      <AdminPage title="Marketing Messages">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Marketing Messages." />
      </AdminPage>
    );
  }

  return <MessageLog />;
}
