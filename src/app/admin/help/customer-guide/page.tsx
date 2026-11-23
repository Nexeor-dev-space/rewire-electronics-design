import type { Metadata } from "next";
import { GuideIndexRoute } from "@/components/admin/help/guide-routes";

export const metadata: Metadata = { title: "Customer Guides" };

export default function CustomerGuidesPage() {
  return <GuideIndexRoute audience="customer" />;
}
