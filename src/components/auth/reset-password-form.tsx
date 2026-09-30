"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/use-auth";
import { apiFieldErrors } from "@/lib/api/api-client";
import { FORGOT_PASSWORD_PAGE_PATH, PASSWORD_MIN_LENGTH, SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { siteConfig } from "@/lib/site";
import { resetPasswordSchema } from "@/validators/auth.validator";

interface Props {
  token?: string;
}

export function ResetPasswordForm({ token }: Props) {
  const resetPassword = useResetPassword();
  const id = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [done, setDone] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: ["The two passwords don't match."] });
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    resetPassword.mutate(parsed.data, {
      onSuccess: () => setDone(true),
      onError: (err) => setErrors(apiFieldErrors(err)),
    });
  }

  const tokenError = errors.token?.[0];
  const passwordError = errors.password?.[0];
  const confirmError = errors.confirmPassword?.[0];

  if (!token || tokenError) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-[1.0625rem] font-medium tracking-tight text-ink">{siteConfig.shortName}</p>
        <div className="mt-6 rounded-2xl border border-line bg-surface-3 p-6 shadow-(--shadow-soft) sm:p-8">
          <h1 className="text-xl font-medium tracking-tight text-ink">Link expired</h1>
          <p className="mt-3 text-sm text-ink-secondary">
            {tokenError ?? "This reset link is missing its token."}
          </p>
          <Link
            href={FORGOT_PASSWORD_PAGE_PATH}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-[1.0625rem] font-medium tracking-tight text-ink">{siteConfig.shortName}</p>
        <div className="mt-6 rounded-2xl border border-line bg-surface-3 p-6 shadow-(--shadow-soft) sm:p-8">
          <h1 className="text-xl font-medium tracking-tight text-ink">Password updated</h1>
          <p className="mt-3 text-sm text-ink-secondary">
            Your password has been reset. Sign in with your new password.
          </p>
          <Link
            href={SIGN_IN_PAGE_PATH}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-accent text-sm font-medium text-white hover:bg-accent-hover"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <p className="text-center text-[1.0625rem] font-medium tracking-tight text-ink">
        {siteConfig.shortName}
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 rounded-2xl border border-line bg-surface-3 p-6 shadow-(--shadow-soft) sm:p-8"
      >
        <h1 className="text-xl font-medium tracking-tight text-ink">Choose a new password</h1>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-password`}>New password</Label>
            <Input
              id={`${id}-password`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={passwordError ? true : undefined}
              className="h-11"
            />
            {passwordError ? (
              <FieldError>{passwordError}</FieldError>
            ) : (
              <p className="text-sm text-ink-muted">At least {PASSWORD_MIN_LENGTH} characters.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-confirm`}>Confirm new password</Label>
            <Input
              id={`${id}-confirm`}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={confirmError ? true : undefined}
              className="h-11"
            />
            <FieldError>{confirmError}</FieldError>
          </div>
        </div>

        {resetPassword.isError && !passwordError && !confirmError && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {resetPassword.error.message}
          </p>
        )}

        <Button type="submit" size="sm" loading={resetPassword.isPending} className="mt-6 w-full">
          Reset password
        </Button>
      </form>
    </div>
  );
}
