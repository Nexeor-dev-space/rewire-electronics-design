"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { useSignIn } from "@/hooks/use-auth";
import { apiFieldErrors } from "@/lib/api/api-client";
import { siteConfig } from "@/lib/site";
import { signInSchema } from "@/validators/auth.validator";

export function SignInForm() {
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
        router.replace(redirectTo);
        router.refresh();
      },
      onError: (error) => setErrors(apiFieldErrors(error)),
    });
  }

  const emailError = errors.email?.[0];
  const passwordError = errors.password?.[0];

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
            <Label htmlFor={`${id}-password`}>Password</Label>
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
    </div>
  );
}
