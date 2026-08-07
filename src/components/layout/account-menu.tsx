"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { accountNav } from "@/lib/site";
import { useAccount } from "@/components/providers/account-provider";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * AccountMenu — the right end of the bar, in whichever of its two states.
 *
 * Signed out it is a single quiet "Sign in" control. Signed in it becomes a
 * disclosure carrying the customer's initials, opening the account surfaces
 * over a hairline-divided panel with Logout below its own rule.
 *
 * Unlike the primary nav panels this one opens on click only, never hover:
 * it is a destination menu, not a browsing aid, and opening it by accident
 * while reaching for the cart would be worse than one extra click.
 */
export function AccountMenu() {
  const { user, ready, signIn, signOut } = useAccount();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  /* Dismiss on outside click and on Escape — the panel holds real links. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Until persisted state is read, render the signed-out control. It is the
  // same size as the signed-in one, so nothing shifts when the swap happens.
  if (!ready || !user) {
    return (
      <button
        type="button"
        // ⚠ Stand-in for the real flow: point this at the auth route (or the
        // provider's sign-in call) once authentication exists.
        onClick={signIn}
        className={cn(
          "hidden h-10 items-center rounded-full px-4 lg:inline-flex",
          "text-[0.8125rem] font-medium tracking-tight text-ink-secondary",
          "transition-colors duration-(--duration-fast)",
          "hover:bg-ink/5 hover:text-ink",
        )}
      >
        Sign in
      </button>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((cur) => !cur)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="account-menu"
        className={cn(
          "flex h-10 items-center gap-2.5 rounded-full pl-1.5 pr-3.5",
          "transition-colors duration-(--duration-fast)",
          open ? "bg-ink/5" : "hover:bg-ink/5",
        )}
      >
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-ink font-mono text-[0.625rem] tracking-[0.06em] text-surface"
        >
          {initials}
        </span>
        <span className="text-[0.8125rem] font-medium tracking-tight text-ink">
          Account
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="account-menu"
            role="menu"
            aria-label="Account"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
            className={cn(
              "absolute right-0 top-[calc(100%+0.5rem)] w-60 overflow-hidden rounded-xl",
              "border border-line bg-surface shadow-(--shadow-float)",
            )}
          >
            <div className="border-b border-line px-4 py-3.5">
              <p className="truncate text-[0.8125rem] font-medium text-ink">
                {user.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-muted">
                {user.email}
              </p>
            </div>

            <ul className="py-1.5">
              {accountNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-4 py-2 text-[0.8125rem] text-ink-secondary",
                      "transition-colors duration-(--duration-fast)",
                      "hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="border-t border-line py-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className={cn(
                  "block w-full px-4 py-2 text-left text-[0.8125rem] text-ink-secondary",
                  "transition-colors duration-(--duration-fast)",
                  "hover:bg-ink/5 hover:text-ink",
                )}
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
