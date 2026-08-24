"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "@/components/providers/account-provider";
import { cn } from "@/lib/utils";

/**
 * Account navigation — one component, two shapes.
 *
 * Desktop: a vertical rail column, active row marked with a filled ink
 * chip and left hairline. Mobile / tablet: a horizontal scroll of the
 * same links, snapping so the active one always parks in view.
 *
 * "Logout" is the only item that is not a route — it fires the account
 * provider's `signOut` and returns to the homepage.
 */

const LINKS = [
  { href: "/account", label: "Overview", icon: OverviewIcon },
  { href: "/account/orders", label: "My Orders", icon: OrdersIcon },
  { href: "/account/waitlists", label: "My Waitlists", icon: WaitlistIcon },
  { href: "/account/returns", label: "Returns & Refunds", icon: ReturnsIcon },
  { href: "/account/wishlist", label: "Wishlist", icon: WishlistHeartIcon },
  { href: "/account/addresses", label: "Saved Addresses", icon: AddressIcon },
  { href: "/account/settings", label: "Account Settings", icon: SettingsIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ============================================================
   Desktop rail
   ============================================================ */

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAccount();

  return (
    <nav
      aria-label="Account"
      className="sticky top-24 hidden lg:block"
    >
      <p className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-muted">
        Your account
      </p>
      <ul className="flex flex-col gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/link flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9375rem]",
                  "transition-[background-color,color] duration-(--duration-fast)",
                  active
                    ? "bg-surface text-ink"
                    : "text-ink-secondary hover:bg-white/[0.03] hover:text-ink",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-ink" : "text-ink-muted group-hover/link:text-ink",
                  )}
                />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="mt-2 border-t border-line pt-2">
          <button
            type="button"
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9375rem] text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-white/[0.03] hover:text-ink"
          >
            <LogoutIcon className="size-4 shrink-0 text-ink-muted" />
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}

/* ============================================================
   Mobile scroll strip
   ============================================================ */

export function AccountTopNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden -mx-(--spacing-gutter) mb-8 border-b border-line px-(--spacing-gutter)">
      <nav
        aria-label="Account (mobile)"
        className="no-scrollbar -mb-px flex snap-x snap-mandatory gap-1 overflow-x-auto"
      >
        {LINKS.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 snap-start whitespace-nowrap border-b-2 px-3.5 py-3 text-sm",
                "transition-[color,border-color] duration-(--duration-fast)",
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* ============================================================
   Icons — 24x24, hairline stroke; keep visual weight consistent
   ============================================================ */

interface IconProps {
  className?: string;
}

function OverviewIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 12l8-8 8 8" />
      <path d="M6 10v9h4v-5h4v5h4v-9" />
    </svg>
  );
}

function OrdersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 7h14l-1.2 12H6.2L5 7z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function ReturnsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h9a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8" />
    </svg>
  );
}

function WishlistHeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 20.25S3.75 15.5 3.75 9.6A4.35 4.35 0 0 1 12 7.6a4.35 4.35 0 0 1 8.25 2c0 5.9-8.25 10.65-8.25 10.65Z" />
    </svg>
  );
}

/**
 * WaitlistIcon — a bell with a small dot at the base, reading as
 * "you'll be notified". Distinct from the WishlistHeartIcon so a
 * scanning reader can tell the two rows apart in the sidebar without
 * reading the labels.
 */
function WaitlistIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10.5 20a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

function AddressIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 21s-7-6.4-7-11a7 7 0 0 1 14 0c0 4.6-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
    </svg>
  );
}

function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h10" />
    </svg>
  );
}
