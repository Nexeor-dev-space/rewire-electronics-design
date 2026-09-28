"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useResendVerification } from "@/hooks/use-auth";
import { Container } from "@/components/layout/container";

/**
 * Shown above every account page while the signed-in customer's email
 * is unverified (Q3 of the auth contract: unverified customers can
 * still sign in, browse and check out — this is a nudge, not a gate).
 */
export function VerifyEmailBanner() {
  const resend = useResendVerification();
  const [sent, setSent] = useState(false);

  return (
    <div role="status" className="border-b border-line bg-surface-2">
      <Container width="wide">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm text-ink-secondary">
            {sent
              ? "Verification email sent — check your inbox."
              : "Please verify your email address to unlock everything on your account."}
          </p>
          <div className="flex items-center gap-3">
            {resend.isError && (
              <p role="alert" className="text-sm text-danger">
                {resend.error.message}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              loading={resend.isPending}
              onClick={() => resend.mutate(undefined, { onSuccess: () => setSent(true) })}
            >
              Resend email
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
