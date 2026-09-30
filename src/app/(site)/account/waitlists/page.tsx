import type { Metadata } from "next";
import { AccountWaitlists } from "@/components/account/account-waitlists";

export const metadata: Metadata = { title: "My waitlists" };

export default function WaitlistsPage() {
  return <AccountWaitlists />;
}
