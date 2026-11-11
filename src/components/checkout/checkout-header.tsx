import Link from "next/link";
import { Logo } from "@/components/layout/logo";

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
 * back-to-cart link on the right is the intended reverse gear; "Need
 * help?" opens a support-focused escape hatch that never leaves the
 * shopper stranded.
 */
export function CheckoutHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--glass-bg)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[110rem] items-center justify-between gap-3 px-(--spacing-gutter) md:h-[4.5rem] md:gap-5 lg:gap-8">
        <Logo />

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
            href="/support"
            className="hidden text-[0.8125rem] text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink sm:inline-flex"
          >
            Need help?
          </Link>

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
            <span className="hidden sm:inline">Back to cart</span>
            <span className="sm:hidden">Cart</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
