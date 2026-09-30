import type { ReactNode } from "react";
import { VerifyEmailBanner } from "@/components/account/verify-email-banner";
import { SignInRedirect } from "@/components/auth/sign-in-redirect";
import { getSession } from "@/lib/auth/session";

/**
 * Gate for every `/account/*` page. Signed out, `children` is never
 * rendered — `SignInRedirect` takes over instead, so nothing behind the
 * gate can leak to a visitor who isn't signed in.
 *
 * Known limit: this layout doesn't re-run on client navigation between
 * account pages, so a session that expires mid-visit is only caught by
 * the next API call's 401 (the `query-provider.tsx` redirect rule).
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) return <SignInRedirect />;

  return (
    <>
      {!session.user.emailVerified && <VerifyEmailBanner />}
      {children}
    </>
  );
}
