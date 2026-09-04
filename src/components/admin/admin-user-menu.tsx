"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminConsole } from "@/lib/admin-console";
import { cn } from "@/lib/utils";

/**
 * Staff menu in the admin header.
 *
 * The identity is a placeholder from `adminConsole.staff`: admin
 * authentication is its own issue, and wiring this to the shopper
 * session would show the wrong account entirely. The menu's links are
 * real admin routes, so the chrome is complete even while the session
 * behind it is not.
 */

const LINKS = [
  { label: "Staff & Roles", href: "/admin/users" },
  { label: "Configuration", href: "/admin/settings/general" },
] as const;

export function AdminUserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const initials = adminConsole.staff.name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
          <span className="block text-sm text-ink">
            {adminConsole.staff.name}
          </span>
          <span className="block text-xs text-ink-muted">
            {adminConsole.staff.role}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-line bg-surface-3 p-1.5 shadow-(--shadow-float)"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <div className="my-1.5 border-t border-line" />
          <Link
            href="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink"
          >
            Leave console
          </Link>
        </div>
      )}
    </div>
  );
}
