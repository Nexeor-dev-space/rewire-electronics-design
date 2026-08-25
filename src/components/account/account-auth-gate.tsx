"use client";

import type { ReactNode } from "react";
import { useAccount } from "@/components/providers/account-provider";
import { Container } from "@/components/layout/container";

/**
 * AccountAuthGate — the stand-in "please sign in" surface.
 *
 * Every account page falls back to this when the account provider
 * reports no user. `signIn()` currently installs the demo customer;
 * once real auth lands this page becomes a redirect and the sign-in
 * flow moves out to `/sign-in`. The gate keeps its shape either way.
 */
export function AccountAuthGate({
  title = "Sign in to your account",
}: {
  title?: string;
}) {
  const { signIn } = useAccount();
  return (
    <div className="pb-(--spacing-section) pt-14 md:pt-24">
      <Container width="narrow">
        <div className="rounded-2xl border border-line bg-surface p-8 text-center md:p-12">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-muted">
            Account
          </p>
          <h1 className="mt-3 font-sans text-[clamp(1.75rem,3vw,2.5rem)] font-light leading-[1.1] tracking-[-0.02em] text-ink">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] text-ink-secondary">
            Orders, returns, wishlist and saved addresses all live inside your
            account. Sign in to see everything in one place.
          </p>
          <button
            type="button"
            onClick={signIn}
            className="mt-6 inline-flex h-12 items-center rounded-full bg-accent px-6 text-[0.9375rem] font-medium text-white hover:bg-accent-hover"
          >
            Sign in
          </button>
          <p className="mt-4 text-[0.75rem] text-ink-muted">
            Demo session — one click installs a reviewable account.
          </p>
        </div>
      </Container>
    </div>
  );
}

/**
 * AccountGated — wrap any account page's view. Renders the gate when
 * the provider has hydrated but no user is signed in; renders `children`
 * when signed in; renders nothing (the account shell skeleton) while
 * persisted state is still loading, so the first paint never flashes
 * the gate for someone who actually is signed in.
 */
export function AccountGated({ children }: { children: ReactNode }) {
  const { ready, user } = useAccount();
  if (!ready) return null;
  if (!user) return <AccountAuthGate />;
  return <>{children}</>;
}
