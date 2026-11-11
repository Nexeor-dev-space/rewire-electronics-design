import type { ReactNode } from "react";
import { Wordmark } from "@/components/layout/wordmark";

/**
 * Shell shared by every auth page. The site header, footer and tab bar come
 * from the `(site)` layout; this only centres the form card beneath the
 * fixed header.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-top grid place-items-center bg-void px-4 pb-12">
      <div className="flex w-full flex-col items-center">
        <Wordmark tagline="Electronics" />
        {children}
      </div>
    </div>
  );
}
