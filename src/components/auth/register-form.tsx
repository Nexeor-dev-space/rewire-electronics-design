"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { useSignUp } from "@/hooks/use-auth";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PASSWORD_MIN_LENGTH, SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { safeNextPath } from "@/lib/auth/next-path";
import { siteConfig } from "@/lib/site";
import { signUpSchema } from "@/validators/auth.validator";

interface Props {
  next?: string;
}

export function RegisterForm({ next }: Props) {
  const router = useRouter();
  const signUp = useSignUp();
  const id = useId();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: ["The two passwords don't match."] });
      return;
    }

    const parsed = signUpSchema.safeParse({
      fullName,
      email,
      password,
      phone: phone.trim() === "" ? undefined : phone,
    });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    signUp.mutate(parsed.data, {
      onSuccess: ({ redirectTo }) => {
        router.replace(safeNextPath(next) ?? redirectTo);
        router.refresh();
      },
      onError: (err) => setErrors(apiFieldErrors(err)),
    });
  }

  const signInHref = next ? `${SIGN_IN_PAGE_PATH}?next=${encodeURIComponent(next)}` : SIGN_IN_PAGE_PATH;
  const nameError = errors.fullName?.[0];
  const emailError = errors.email?.[0];
  const phoneError = errors.phone?.[0];
  const passwordError = errors.password?.[0];
  const confirmError = errors.confirmPassword?.[0];

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
        <h1 className="text-xl font-medium tracking-tight text-ink">Create an account</h1>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Full name</Label>
            <Input
              id={`${id}-name`}
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              aria-invalid={nameError ? true : undefined}
              className="h-11"
            />
            <FieldError>{nameError}</FieldError>
          </div>

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
            <Label htmlFor={`${id}-phone`}>Phone (optional)</Label>
            <Input
              id={`${id}-phone`}
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={phoneError ? true : undefined}
              className="h-11"
            />
            <FieldError>{phoneError}</FieldError>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-password`}>Password</Label>
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
            <Label htmlFor={`${id}-confirm`}>Confirm password</Label>
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

        {signUp.isError && Object.keys(errors).length === 0 && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {signUp.error.message}
          </p>
        )}

        <Button type="submit" size="sm" loading={signUp.isPending} className="mt-6 w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-[0.875rem] text-ink-secondary">
        Already have an account?{" "}
        <Link href={signInHref} className="font-medium text-ink hover:text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
