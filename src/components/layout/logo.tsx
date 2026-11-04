import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Logo — the Rewire wordmark, linked home.
 *
 * The one source of the brand mark: the header, the checkout header and the
 * footer all render this, so its proportions, colour and spacing can never
 * drift between pages. `caption` is the small mono line under the mark —
 * "Electronics" by default, "Checkout" in the checkout's reduced chrome.
 */
export function Logo({
  caption = "Electronics",
  className,
}: {
  caption?: string;
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
      <span className="block text-base font-medium leading-none tracking-[0.32em] text-ink">
        REWIRE<span className="text-accent">.</span>
      </span>
      <span className="mt-1 hidden font-mono text-[0.75rem] uppercase leading-none tracking-[0.42em] text-ink-muted sm:block">
        {caption}
      </span>
    </Link>
  );
}
