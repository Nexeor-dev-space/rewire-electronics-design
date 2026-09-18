import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { adminConsole } from "@/lib/admin-console";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

/**
 * Admin route group.
 *
 * Sits outside the `(site)` group, so the console never inherits the
 * storefront header, footer or mobile tab bar — the operator is working,
 * not shopping. The shell it renders instead is the same for every admin
 * module.
 *
 * Signed out → sign-in. Signed in without admin access (a Customer) → the
 * access-denied screen instead of the console.
 */

const consoleName = `${adminConsole.name} ${adminConsole.label}`;

export const metadata: Metadata = {
  title: {
    default: consoleName,
    template: `%s — ${consoleName}`,
  },
  // A staff console has no business in search results.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!canAccessAdmin(session.user.role)) return <AccessDenied email={session.user.email} />;

  return <AdminShell viewer={session.user}>{children}</AdminShell>;
}
