import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/account-settings";
import { AccountGated } from "@/components/account/account-auth-gate";

export const metadata: Metadata = { title: "Account settings" };

export default function SettingsPage() {
  return (
    <AccountGated>
      <AccountSettings />
    </AccountGated>
  );
}
