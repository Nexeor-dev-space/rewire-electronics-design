import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
  // The token sits in the URL — never let it leak to another site's server logs.
  referrer: "no-referrer",
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token} />;
}
