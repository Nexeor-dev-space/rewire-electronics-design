import Link from "next/link";
import { siteConfig } from "@/lib/site";

/**
 * CheckoutHeader — the site nav's stunt double.
 *
 * A checkout page's chrome should tell a user two things: they haven't
 * left Rewire, and this page is safe to hand a card to. Nothing else —
 * no primary nav, no search, no cart button — because every extra link
 * is one more way to abandon the funnel before it closes.
 *
 * The wordmark still links home so a shopper who genuinely changes their
 * mind can leave, but it is the only outward path from the page. The
 * back-to-cart link on the right is the intended reverse gear.
 */
export function CheckoutHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/90 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[110rem] items-center justify-between gap-6 px-(--spacing-gutter) md:h-20">
        <Link
          href="/"
          aria-label={`${siteConfig.name} — home`}
          className="-my-2 shrink-0 py-2 transition-opacity duration-(--duration-fast) hover:opacity-70"
        >
          <span className="block text-base font-medium leading-none tracking-[0.32em] text-ink">
            REWIRE<span className="text-accent">.</span>
          </span>
          <span className="mt-1 hidden font-mono text-[0.75rem] uppercase leading-none tracking-[0.42em] text-ink-muted sm:block">
            Checkout
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-secondary sm:inline-flex">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 text-live"
            >
              <path d="M8.4 10.3V7.6a3.6 3.6 0 1 1 7.2 0v2.7" />
              <path d="M6.9 10.3h10.2a1.7 1.7 0 0 1 1.7 1.7v6a1.7 1.7 0 0 1-1.7 1.7H6.9a1.7 1.7 0 0 1-1.7-1.7v-6a1.7 1.7 0 0 1 1.7-1.7Z" />
            </svg>
            Secure Checkout
          </span>

          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[0.8125rem] text-ink transition-colors duration-(--duration-fast) hover:border-line-strong"
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3"
            >
              <path d="M13 8H3M7 4l-4 4 4 4" />
            </svg>
            Back to cart
          </Link>
        </div>
      </div>
    </header>
  );
}
