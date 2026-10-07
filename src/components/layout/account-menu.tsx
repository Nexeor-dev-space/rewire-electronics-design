"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGetMe } from "@/hooks/use-auth";
import { signInHref } from "@/lib/auth/next-path";
import { ACCOUNT_HOME_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * AccountMenu — the right end of the bar, in whichever of its two states.
 *
 * Signed out it is a single quiet "Sign in" control. Signed in it is a
 * link to the account home carrying the customer's initials.
 *
 * **Both states occupy the same box.** The signed-out control is a
 * "Sign in" pill; the signed-in one is an avatar chip plus the word
 * "Account", and it is the wider of the two. The swap happens after
 * mount, when the provider has read persisted state — so a signed-in
 * reader used to watch the utility row grow by ~40px on every page
 * load, which pushed the centred search field left and re-flowed the
 * bar. `SLOT_WIDTH` reserves the wider of the two from first paint, so
 * nothing moves when the real state arrives.
 */

/**
 * Wide enough for the signed-in control (28px avatar + gap + "Account"
 * + padding). The signed-out pill centres inside the same box.
 */
const SLOT_WIDTH = "w-[7.5rem]";
export function AccountMenu() {
  const me = useGetMe();
  const pathname = usePathname();

  // Until the session query resolves, render the signed-out control. It is
  // the same size as the signed-in one, so nothing shifts when the swap
  // happens.
  if (me.isPending || !me.data) {
    return (
      <div className={cn("hidden lg:block", SLOT_WIDTH)}>
        <Link
          href={signInHref(pathname)}
          className={cn(
            "flex h-10 w-full items-center justify-center rounded-full px-4",
            "text-[0.8125rem] font-medium tracking-tight text-ink-secondary",
            "transition-colors duration-(--duration-fast)",
            "hover:bg-ink/5 hover:text-ink",
          )}
        >
          Sign in
        </Link>
      </div>
    );
  }

  const initials = me.data.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  const active = pathname.startsWith(ACCOUNT_HOME_PATH);

  return (
    <div className={cn("hidden lg:block", SLOT_WIDTH)}>
      <Link
        href={ACCOUNT_HOME_PATH}
        aria-current={pathname === ACCOUNT_HOME_PATH ? "page" : undefined}
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-full pl-1.5 pr-3.5",
          "transition-colors duration-(--duration-fast)",
          active ? "bg-ink/5" : "hover:bg-ink/5",
        )}
      >
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[0.625rem] tracking-[0.06em] text-surface"
        >
          {initials}
        </span>
        <span className="truncate text-[0.8125rem] font-medium tracking-tight text-ink">
          Account
        </span>
      </Link>
    </div>
  );
}
