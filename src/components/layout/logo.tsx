import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo-mark";

/**
 * Logo — the Rewire logo, linked home.
 *
 * `variant="mark"` (the default) is the logo artwork, `LogoMark`, used by
 * the header, the checkout header and the invoice. `variant="text"` is the
 * typeset wordmark the footer keeps on purpose. Either way this is the one
 * place the brand is drawn, so it can never drift between pages.
 */
export function Logo({
  variant = "mark",
  className,
}: {
  variant?: "mark" | "text";
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} — home`}
      className={cn(
        "-my-2 inline-block shrink-0 py-2 transition-opacity duration-(--duration-fast) hover:opacity-70",
        className,
      )}
    >
      {variant === "mark" ? (
        <LogoMark className="h-8 md:h-9" />
      ) : (
        <>
          <span className="block text-base font-medium leading-none tracking-[0.32em] text-ink">
            REWIRE<span className="text-accent">.</span>
          </span>
          <span className="mt-1 hidden font-mono text-[0.75rem] uppercase leading-none tracking-[0.42em] text-ink-muted sm:block">
            Electronics
          </span>
        </>
      )}
    </Link>
  );
}
