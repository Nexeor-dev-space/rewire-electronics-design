"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/hooks/use-auth";
import { apiFieldErrors } from "@/lib/api/api-client";
import { ACCOUNT_HOME_PATH, FORGOT_PASSWORD_PAGE_PATH, SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { siteConfig } from "@/lib/site";

interface Props {
  token?: string;
}

/**
 * Confirmation is a deliberate click, not an auto-submit on mount: an
 * email link scanner that pre-fetches this URL must not be able to burn
 * the one-time token before the customer ever sees the page.
 */
export function VerifyEmailConfirm({ token }: Props) {
  const verifyEmail = useVerifyEmail();
  const tokenError = verifyEmail.isError ? apiFieldErrors(verifyEmail.error).token?.[0] : undefined;

  if (!token) {
    return (
      <Card title="Link incomplete">
        <p className="mt-3 text-sm text-ink-secondary">
          This verification link is missing its token. Sign in and resend it from your account.
        </p>
        <Link
          href={SIGN_IN_PAGE_PATH}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover"
        >
          Sign in
        </Link>
      </Card>
    );
  }

  if (verifyEmail.isSuccess) {
    return (
      <Card title="Email verified">
        <p className="mt-3 text-sm text-ink-secondary">Your email address is confirmed.</p>
        <Link
          href={ACCOUNT_HOME_PATH}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover"
        >
          Go to my account
        </Link>
      </Card>
    );
  }

  if (tokenError) {
    return (
      <Card title="Link expired">
        <p className="mt-3 text-sm text-ink-secondary">{tokenError}</p>
        <Link
          href={FORGOT_PASSWORD_PAGE_PATH}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full border border-line-strong text-sm font-medium text-ink hover:border-ink"
        >
          Sign in to resend
        </Link>
      </Card>
    );
  }

  return (
    <Card title="Confirm your email">
      <p className="mt-3 text-sm text-ink-secondary">Click below to verify this email address.</p>
      <Button
        size="sm"
        loading={verifyEmail.isPending}
        onClick={() => verifyEmail.mutate({ token })}
        className="mt-6 w-full"
      >
        Confirm my email
      </Button>
      {verifyEmail.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {verifyEmail.error.message}
        </p>
      )}
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm text-center">
      <p className="text-[1.0625rem] font-medium tracking-tight text-ink">{siteConfig.shortName}</p>
      <div className="mt-6 rounded-2xl border border-line bg-surface-3 p-6 shadow-(--shadow-soft) sm:p-8">
        <h1 className="text-xl font-medium tracking-tight text-ink">{title}</h1>
        {children}
      </div>
    </div>
  );
}
