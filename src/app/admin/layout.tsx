import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminConsole } from "@/lib/admin-console";

/**
 * Admin route group.
 *
 * Sits outside the `(site)` group, so the console never inherits the
 * storefront header, footer or mobile tab bar — the operator is working,
 * not shopping. The shell it renders instead is the same for every admin
 * module.
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

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
