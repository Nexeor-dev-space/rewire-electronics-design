"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { useSignIn } from "@/hooks/use-auth";
import { apiFieldErrors } from "@/lib/api/api-client";
import { FORGOT_PASSWORD_PAGE_PATH, REGISTER_PAGE_PATH } from "@/lib/constants";
import { safeNextPath } from "@/lib/auth/next-path";
import { siteConfig } from "@/lib/site";
import { signInSchema } from "@/validators/auth.validator";

interface Props {
  /** Where to land after a successful sign-in, if it's a safe path. */
  next?: string;
}

export function SignInForm({ next }: Props) {
  const router = useRouter();
  const signIn = useSignIn();
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    signIn.mutate(parsed.data, {
      onSuccess: ({ redirectTo }) => {
        router.replace(safeNextPath(next) ?? redirectTo);
        router.refresh();
      },
      onError: (err) => setErrors(apiFieldErrors(err)),
    });
  }

  const emailError = errors.email?.[0];
  const passwordError = errors.password?.[0];
  const registerHref = next ? `${REGISTER_PAGE_PATH}?next=${encodeURIComponent(next)}` : REGISTER_PAGE_PATH;

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
        <h1 className="text-xl font-medium tracking-tight text-ink">Sign in</h1>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
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

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor={`${id}-password`}>Password</Label>
              <Link
                href={FORGOT_PASSWORD_PAGE_PATH}
                className="text-[0.8125rem] font-medium text-ink-secondary hover:text-ink"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id={`${id}-password`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={passwordError ? true : undefined}
              className="h-11"
            />
            <FieldError>{passwordError}</FieldError>
          </div>
        </div>

        {signIn.isError && !emailError && !passwordError && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {signIn.error.message}
          </p>
        )}

        <Button type="submit" size="sm" loading={signIn.isPending} className="mt-6 w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[0.875rem] text-ink-secondary">
        New to {siteConfig.shortName}?{" "}
        <Link href={registerHref} className="font-medium text-ink hover:text-accent">
          Create an account
        </Link>
      </p>
    </div>
  );
}
