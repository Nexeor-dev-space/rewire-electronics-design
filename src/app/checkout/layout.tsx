import type { ReactNode } from "react";
import { SignInRedirect } from "@/components/auth/sign-in-redirect";
import { getSession, hasSessionCookie } from "@/lib/auth/session";

export default async function CheckoutLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) return <SignInRedirect expired={await hasSessionCookie()} />;

  return children;
}
