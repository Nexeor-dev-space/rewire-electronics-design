import type { Metadata } from "next";
import { GuideView } from "@/components/admin/help/guide-view";
import { CUSTOMER_GUIDE } from "@/lib/user-guides/customer-guide";

export const metadata: Metadata = { title: CUSTOMER_GUIDE.title };

export default function CustomerGuidePage() {
  return <GuideView guide={CUSTOMER_GUIDE} />;
}
