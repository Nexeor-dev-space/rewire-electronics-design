"use client";

import { useSyncExternalStore } from "react";
import type { AdminTheme } from "@/lib/admin-console";
import { ADMIN_THEME_COOKIE, ADMIN_THEME_COOKIE_MAX_AGE_SECONDS } from "@/lib/constants";

/**
 * The header's light / dark switch. With no saved choice the console follows
 * the OS (CSS `light-dark()` in globals.css); a click saves the opposite of
 * what is showing in a cookie the admin layout reads, so the next page load
 * renders it straight away.
 */

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The OS preference; false on the server, so the first render always matches. */
function usePrefersDark() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
}

export function AdminThemeToggle({
  theme,
  onChange,
}: {
  /** The saved choice; null while following the OS. */
  theme: AdminTheme | null;
  onChange: (theme: AdminTheme) => void;
}) {
  const prefersDark = usePrefersDark();
  const showing: AdminTheme = theme ?? (prefersDark ? "dark" : "light");
  const next: AdminTheme = showing === "dark" ? "light" : "dark";
  const label = `Switch to ${next} mode`;

  function toggle() {
    document.cookie = `${ADMIN_THEME_COOKIE}=${next}; path=/; max-age=${ADMIN_THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    onChange(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
        aria-hidden
      >
        {next === "dark" ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
