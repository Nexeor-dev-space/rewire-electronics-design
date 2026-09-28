"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInHref } from "@/lib/auth/next-path";

/**
 * Client-side bounce to sign-in, carrying the full path the visitor was
 * trying to reach (including its query string, e.g. a deep link like
 * `/account/orders/123`). A server `redirect()` can't do this from a
 * layout — a layout has no access to the request's pathname.
 */
export function SignInRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(signInHref(window.location.pathname + window.location.search));
  }, [router]);

  return null;
}
