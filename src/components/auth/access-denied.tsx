import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Shown instead of the console to a signed-in account without admin access. */
export function AccessDenied({ email }: { email: string }) {
  return (
    <main className="admin-theme grid min-h-dvh place-items-center bg-void px-4 py-12">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow">Access denied</p>
        <h1 className="mt-3 text-2xl font-light tracking-[-0.02em] text-ink">
          This area is for staff only
        </h1>
        <p className="mt-3 text-sm text-ink-secondary">
          You&apos;re signed in as <span className="text-ink">{email}</span>, which doesn&apos;t
          have access to the admin console.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/account" className={buttonVariants({ size: "sm" })}>
            Go to my account
          </Link>
          <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Use a different account
          </Link>
        </div>
      </div>
    </main>
  );
}
