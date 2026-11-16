import type { Metadata } from "next";
import { GuideView } from "@/components/admin/help/guide-view";
import { ADMIN_GUIDE } from "@/lib/user-guides/admin-guide";

export const metadata: Metadata = { title: ADMIN_GUIDE.title };

export default function AdminGuidePage() {
  return <GuideView guide={ADMIN_GUIDE} />;
}
