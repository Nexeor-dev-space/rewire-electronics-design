import type { Metadata } from "next";
import { VerifyEmailConfirm } from "@/components/auth/verify-email-confirm";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
  // The token sits in the URL — never let it leak to another site's server logs.
  referrer: "no-referrer",
};

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <VerifyEmailConfirm token={token} />;
}
