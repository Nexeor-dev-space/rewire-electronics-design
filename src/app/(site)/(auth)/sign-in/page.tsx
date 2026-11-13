import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SESSION_EXPIRED_PARAM } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ next?: string; [SESSION_EXPIRED_PARAM]?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;

  return <SignInForm next={params.next} expired={params[SESSION_EXPIRED_PARAM] === "1"} />;
}
