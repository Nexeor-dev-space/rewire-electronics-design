"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignOut } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/auth";

/**
 * Staff menu in the admin header — who is signed in, where to go, and the
 * way out. The identity is the real session, passed down from the admin
 * layout.
 */

const LINKS = [
  { label: "Staff accounts", href: "/admin/users/staff" },
  { label: "Configuration", href: "/admin/settings/general" },
] as const;

const ITEM =
  "block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink";

export function AdminUserMenu({ viewer }: { viewer: SessionUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const signOut = useSignOut();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initials = viewer.fullName
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => {
        router.replace("/sign-in");
        router.refresh();
      },
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5",
          "transition-colors duration-(--duration-fast) hover:bg-surface",
          open && "bg-surface",
        )}
      >
        <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-medium text-white">
          {initials}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm text-ink">{viewer.fullName}</span>
          <span className="block text-xs text-ink-muted">{ROLE_LABELS[viewer.role]}</span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-line bg-surface-3 p-1.5 shadow-(--shadow-float)"
        >
          <p className="truncate px-3 pb-2 pt-1.5 text-xs text-ink-muted">{viewer.email}</p>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={ITEM}
            >
              {link.label}
            </Link>
          ))}
          <div className="my-1.5 border-t border-line" />
          <Link href="/" role="menuitem" onClick={() => setOpen(false)} className={ITEM}>
            Leave console
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            aria-busy={signOut.isPending || undefined}
            className={cn(ITEM, "disabled:opacity-40")}
          >
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </button>
          {signOut.isError && (
            <p role="alert" className="px-3 pb-1.5 text-xs text-danger">
              {signOut.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
