import type { Metadata } from "next";
import { AccountWaitlists } from "@/components/account/account-waitlists";
import { AccountGated } from "@/components/account/account-auth-gate";

export const metadata: Metadata = { title: "My waitlists" };

export default function WaitlistsPage() {
  return (
    <AccountGated>
      <AccountWaitlists />
    </AccountGated>
  );
}
