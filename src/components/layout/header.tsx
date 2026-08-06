"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { mainNav, siteConfig } from "@/lib/site";
import { useScrollState } from "@/hooks/use-scroll-state";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO, overlayFade } from "@/lib/motion";
import { Button } from "@/components/ui/button";

/**
 * Header — floating chrome over the page.
 * Transparent at top, frosted glass once scrolled, retreats on
 * downward scroll and returns instantly on upward intent.
 */
export function Header() {
  const { scrolled, scrollingDown } = useScrollState();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change; lock body scroll while open.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{ y: scrollingDown && !menuOpen ? "-100%" : "0%" }}
        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      >
        <div
          className={cn(
            "transition-[background-color,border-color,backdrop-filter] duration-(--duration-base)",
            scrolled && !menuOpen
              ? "glass border-x-0 border-t-0"
              : "border-b border-transparent",
          )}
        >
          <div className="mx-auto flex h-16 md:h-20 max-w-[110rem] items-center justify-between px-(--spacing-gutter)">
            {/* Wordmark */}
            <Link
              href="/"
              className="text-lg font-semibold tracking-tighter text-ink"
              aria-label={`${siteConfig.name} — home`}
            >
              Rewire
              <span className="text-copper">.</span>
            </Link>

            {/* Desktop nav */}
            <nav aria-label="Primary" className="hidden md:block">
              <ul className="flex items-center gap-8">
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative inline-flex items-center gap-2 py-2 text-sm tracking-tight",
                        "text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink",
                        pathname.startsWith(item.href) && "text-ink",
                      )}
                    >
                      {item.label}
                      {item.badge === "live" && (
                        <span
                          aria-label="Live now"
                          className="size-1.5 rounded-full bg-live animate-pulse-dot"
                        />
                      )}
                      {/* Animated underline */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-ink",
                          "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                          "group-hover:origin-left group-hover:scale-x-100",
                          pathname.startsWith(item.href) && "origin-left scale-x-100",
                        )}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="hidden md:inline-flex">
                Get access
              </Button>

              {/* Mobile menu toggle */}
              <button
                type="button"
                className="md:hidden relative flex size-11 items-center justify-center"
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="relative block h-3 w-6">
                  <motion.span
                    className="absolute left-0 top-0 h-px w-full bg-ink"
                    animate={menuOpen ? { y: 5.5, rotate: 45 } : { y: 0, rotate: 0 }}
                    transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                  />
                  <motion.span
                    className="absolute left-0 bottom-0 h-px w-full bg-ink"
                    animate={menuOpen ? { y: -5.5, rotate: -45 } : { y: 0, rotate: 0 }}
                    transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu — full-screen editorial overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-40 md:hidden bg-void/95 backdrop-blur-2xl"
            variants={overlayFade}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <nav
              aria-label="Primary mobile"
              className="flex h-full flex-col justify-center px-(--spacing-gutter)"
            >
              <ul className="space-y-2">
                {mainNav.map((item, i) => (
                  <li key={item.href} className="overflow-hidden">
                    <motion.div
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      transition={{
                        duration: DURATION.slow,
                        ease: EASE_OUT_EXPO,
                        delay: 0.06 * i + 0.1,
                      }}
                    >
                      <Link
                        href={item.href}
                        className="inline-flex items-baseline gap-3 font-display text-display-lg text-ink"
                      >
                        <span className="font-mono text-xs text-ink-faint">
                          0{i + 1}
                        </span>
                        {item.label}
                        {item.badge === "live" && (
                          <span className="size-2 rounded-full bg-live animate-pulse-dot" />
                        )}
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>
              <motion.div
                className="mt-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: DURATION.base }}
              >
                <Button variant="accent" size="lg" className="w-full">
                  Get access
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
