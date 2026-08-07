"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "@/components/providers/account-provider";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * CartButton — a link to the bag, carrying its own count.
 *
 * The count is a small ink chip on the icon's shoulder, not a coloured
 * badge: the bar stays monochrome and the number reads as information
 * rather than an alert. It mounts only once persisted state has been read
 * (`ready`), so it never flashes in on first paint, and it announces the
 * count in the accessible name rather than as a separate live region.
 */
export function CartButton({ className }: { className?: string }) {
  const { cartCount, ready } = useAccount();
  const showCount = ready && cartCount > 0;

  return (
    <Link
      href="/cart"
      aria-label={
        showCount
          ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`
          : "Cart, empty"
      }
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full",
        "text-ink-secondary transition-colors duration-(--duration-fast)",
        "hover:bg-ink/5 hover:text-ink",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[1.15rem]"
      >
        <path d="M4.5 7.5h15l-1.2 12H5.7l-1.2-12z" />
        <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
      </svg>

      <AnimatePresence>
        {showCount && (
          <motion.span
            key={cartCount}
            aria-hidden
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
            className={cn(
              "absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full px-1",
              "bg-ink font-mono text-[0.5625rem] leading-4 tabular-nums text-surface",
            )}
          >
            {cartCount > 9 ? "9+" : cartCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
