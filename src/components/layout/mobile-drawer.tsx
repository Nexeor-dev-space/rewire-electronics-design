"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { accountNav, siteConfig } from "@/lib/site";
import { getDrawerSections } from "@/lib/navigation";
import { useAccount } from "@/components/providers/account-provider";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onJoinWaitlist: () => void;
  /** Hands off to the header's search panel — the drawer has no field. */
  onOpenSearch: () => void;
  /** Marks the current route with the same indicator the bar uses. */
  isActive: (href: string) => boolean;
}

/**
 * MobileDrawer — a side panel from the right, not a full-bleed takeover.
 *
 * Items rise in sequence behind the panel's own slide. Sections that
 * carry a desktop dropdown become accordions here rather than a second
 * navigation level, so the whole tree stays one screen deep.
 */
export function MobileDrawer({
  open,
  onClose,
  onJoinWaitlist,
  onOpenSearch,
  isActive,
}: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const sections = getDrawerSections();
  const { user, ready, signIn, signOut } = useAccount();

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      return;
    }
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 60);

    return () => {
      window.clearTimeout(id);
      document.documentElement.style.overflow = "";
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="drawer"
          className="fixed inset-0 z-90 lg:hidden"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base }}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-line bg-void"
          >
            <div className="flex h-16 shrink-0 items-center justify-end px-(--spacing-gutter) md:h-20">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-ink/5 hover:text-ink"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="size-4"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            {/* Search is pinned: it stays reachable no matter how far the
                accordions below are scrolled. Tapping hands off to the
                header's own panel rather than duplicating the field. */}
            <div className="shrink-0 px-(--spacing-gutter) pb-5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
                className={cn(
                  "flex h-12 w-full items-center gap-3 rounded-full px-5",
                  "border border-line bg-surface text-left",
                  "transition-colors duration-(--duration-fast) hover:border-line-strong",
                )}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className="size-[1.05rem] shrink-0 text-ink-muted"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16.5 16.5L21 21" />
                </svg>
                <span className="text-sm text-ink-muted">
                  Search certified devices...
                </span>
              </button>
            </div>

            <nav
              aria-label="Primary"
              // `data-lenis-prevent` hands wheel + touch events inside
              // this pane back to the browser. Without it Lenis' virtual
              // scroll swallows every gesture and tries to scroll the
              // page — which the open drawer has locked — so the nav
              // list reads as unscrollable. Same fix as the shop
              // sidebar. `overscroll-contain` stops a fast flick at the
              // list's end from chaining into the locked page behind.
              data-lenis-prevent
              className="flex-1 overflow-y-auto overscroll-contain px-(--spacing-gutter) pb-8"
            >
              <ul>
                {sections.map((item, i) => (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: DURATION.base,
                      ease: EASE_OUT_EXPO,
                      delay: 0.12 + i * 0.05,
                    }}
                    className="border-b border-line"
                  >
                    {/* A section without children is a destination, not
                        a disclosure — rendered as a plain link so a
                        single-brand category costs one tap, never an
                        accordion that opens onto nothing. */}
                    {item.items.length === 0 ? (
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex w-full items-center gap-3 py-4 text-lg tracking-tight text-ink"
                      >
                        {item.label}
                        {isActive(item.href) && (
                          <span
                            aria-hidden
                            className="size-1 rounded-full bg-accent"
                          />
                        )}
                      </Link>
                    ) : (
                    <>
                        <button
                          type="button"
                          aria-expanded={expanded === item.label}
                          aria-controls={`drawer-${item.label}`}
                          onClick={() =>
                            setExpanded((cur) =>
                              cur === item.label ? null : item.label,
                            )
                          }
                          className="flex w-full items-center justify-between gap-4 py-4 text-left text-lg tracking-tight text-ink"
                        >
                          <span className="flex items-center gap-3">
                            {item.label}
                            {isActive(item.href) && (
                              <span
                                aria-hidden
                                className="size-1 rounded-full bg-accent"
                              />
                            )}
                            {item.badge === "live" && (
                              <span
                                aria-hidden
                                className="size-1.5 animate-pulse-dot rounded-full bg-live"
                              />
                            )}
                          </span>
                          <motion.svg
                            aria-hidden
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            animate={{
                              rotate: expanded === item.label ? 180 : 0,
                            }}
                            transition={{ duration: DURATION.fast }}
                            className="size-3.5 shrink-0 text-ink-muted"
                          >
                            <path d="M4 6l4 4 4-4" />
                          </motion.svg>
                        </button>

                        <AnimatePresence initial={false}>
                          {expanded === item.label && (
                            <motion.div
                              id={`drawer-${item.label}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: DURATION.base,
                                ease: EASE_OUT_EXPO,
                              }}
                              className="overflow-hidden"
                            >
                              <ul className="pb-4 pl-1">
                                {item.items.map((child) => (
                                  <li key={child.label + child.href}>
                                    <Link
                                      href={child.href}
                                      onClick={onClose}
                                      className="flex items-baseline justify-between gap-4 py-2.5 text-sm text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink"
                                    >
                                      {child.label}
                                      {child.note && (
                                        <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-faint">
                                          {child.note}
                                        </span>
                                      )}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </>
                    )}
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: DURATION.base,
                  ease: EASE_OUT_EXPO,
                  delay: 0.12 + sections.length * 0.05,
                }}
                className="mt-8"
              >
                {/* ---------- Account ----------
                    The drawer carries what the bar hides below lg: the whole
                    signed-in surface, or the one control that creates it. */}
                {ready && user && (
                  <div className="mb-8">
                    <div className="flex items-center gap-3 border-b border-line pb-4">
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[0.6875rem] text-surface"
                      >
                        {user.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {user.name}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">
                          {user.email}
                        </span>
                      </span>
                    </div>

                    <ul className="pt-2">
                      {accountNav.map((item) => (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="block py-2.5 text-sm text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                      <li className="mt-2 border-t border-line pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            signOut();
                          }}
                          className="block w-full py-2.5 text-left text-sm text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink"
                        >
                          Logout
                        </button>
                      </li>
                    </ul>
                  </div>
                )}

                <p className="mt-8 font-mono text-[0.75rem] uppercase leading-relaxed tracking-[0.16em] text-ink-muted">
                  Premium refurbished electronics
                </p>
                <p className="mt-2 text-xs text-ink-faint">
                  {siteConfig.tagline}
                </p>
              </motion.div>
            </nav>

            {/* ---------- Fixed foot ----------
                Identity, basket and the one CTA stay put while the
                accordions scroll behind them. */}
            <div className="shrink-0 border-t border-line bg-void px-(--spacing-gutter) pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  // ⚠ Stand-in, same as the bar — point at the auth route
                  // once authentication exists.
                  onClick={() => {
                    onClose();
                    if (!user) signIn();
                  }}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center rounded-full",
                    "border border-line text-sm font-medium tracking-tight text-ink",
                    "transition-colors duration-(--duration-fast) hover:border-ink",
                  )}
                >
                  {ready && user ? "Account" : "Sign in"}
                </button>

                <Link
                  href="/cart"
                  onClick={onClose}
                  className={cn(
                    "flex h-11 flex-1 items-center justify-center rounded-full",
                    "border border-line text-sm font-medium tracking-tight text-ink",
                    "transition-colors duration-(--duration-fast) hover:border-ink",
                  )}
                >
                  Cart
                </Link>
              </div>

              {/* The Join Waitlist footer CTA was removed with the new
                  e-commerce top nav — a browse-first drawer should
                  close on Sign in / Cart, not on marketing. Waitlist
                  entries survive on the drop-specific surfaces (hero,
                  upcoming drops, About) that own them. */}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
