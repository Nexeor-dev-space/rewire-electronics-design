import type { ReactNode } from "react";

/**
 * Chrome-less shell shared by every auth page — no header, footer or tab
 * bar, the same reduced-chrome treatment `/checkout` uses. Storefront
 * tokens, not `admin-theme`: most visitors here are customers, not staff.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-void px-4 py-12">{children}</main>;
}
