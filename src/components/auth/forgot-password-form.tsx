"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { useForgotPassword } from "@/hooks/use-auth";
import { apiFieldErrors } from "@/lib/api/api-client";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { siteConfig } from "@/lib/site";
import { forgotPasswordSchema } from "@/validators/auth.validator";

/**
 * Always shows the same confirmation on success — whether or not the
 * email belongs to an account — so response text can't be used to probe
 * which emails have one.
 */
export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const id = useId();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    forgotPassword.mutate(parsed.data, {
      onSuccess: () => setSent(true),
      onError: (err) => setErrors(apiFieldErrors(err)),
    });
  }

  const emailError = errors.email?.[0];

  return (
    <div className="w-full max-w-sm">
      <p className="text-center text-[1.0625rem] font-medium tracking-tight text-ink">
        {siteConfig.shortName}
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-surface-3 p-6 shadow-(--shadow-soft) sm:p-8">
        <h1 className="text-xl font-medium tracking-tight text-ink">Reset your password</h1>

        {sent ? (
          <p className="mt-4 text-sm text-ink-secondary" role="status">
            If an account exists for that email, we&apos;ve sent a link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-4">
            <p className="text-sm text-ink-secondary">
              Enter the email on your account and we&apos;ll send a link to reset your password.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <Label htmlFor={`${id}-email`}>Email</Label>
              <Input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={emailError ? true : undefined}
                className="h-11"
              />
              <FieldError>{emailError}</FieldError>
            </div>

            {forgotPassword.isError && !emailError && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {forgotPassword.error.message}
              </p>
            )}

            <Button type="submit" size="sm" loading={forgotPassword.isPending} className="mt-6 w-full">
              Send reset link
            </Button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-[0.875rem] text-ink-secondary">
        <Link href={SIGN_IN_PAGE_PATH} className="font-medium text-ink hover:text-accent">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
