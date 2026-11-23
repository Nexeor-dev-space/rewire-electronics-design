import type { Metadata } from "next";
import { GuideIndexRoute } from "@/components/admin/help/guide-routes";

export const metadata: Metadata = { title: "Admin Guides" };

export default function AdminGuidesPage() {
  return <GuideIndexRoute audience="admin" />;
}
