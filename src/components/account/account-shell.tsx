import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { AccountSidebar, AccountTopNav } from "./account-nav";
import { cn } from "@/lib/utils";

/**
 * AccountShell — the two-column frame every account page sits in.
 *
 * Desktop: sidebar column 3/12 and content column 9/12, with a hairline
 * divider between. Below `lg` the sidebar collapses to a horizontal
 * pill-bar at the top of the page, keeping the content in one column.
 */

interface Props {
  title: string;
  subtitle?: string;
  /** Right-hand chrome next to the title (e.g., a "Sign out" button). */
  aside?: ReactNode;
  children: ReactNode;
}

export function AccountShell({ title, subtitle, aside, children }: Props) {
  return (
    <div className="pb-(--spacing-section) pt-14 md:pt-20">
      {/* `wide` — the site's `max-w-[110rem]` measure, the same one the
          header, footer, wishlist, cart and every product page sit on.
          This shell was the only surface on `default` (`max-w-7xl`),
          which caps the content at 1280px however wide the window is:
          on a 2000px display it inset the sidebar 360px from the edge
          while the wordmark directly above it stayed on the 48px
          gutter, so the account read as a narrow document dropped onto
          the site rather than a page of it.

          The `width` prop went with it. It existed to let the order
          detail opt into this measure; now that the measure is the
          default there is no second option for it to name. */}
      <Container width="wide">
        <AccountTopNav />

        <div
          className={cn(
            "grid gap-10 lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16",
          )}
        >
          <aside className="lg:col-span-3">
            <AccountSidebar />
          </aside>

          <div className="lg:col-span-9">
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
              <div>
                <h1 className="font-sans text-[clamp(1.75rem,3vw,2.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-ink">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-3 max-w-xl text-[0.9375rem] text-ink-secondary">
                    {subtitle}
                  </p>
                )}
              </div>
              {aside}
            </header>

            {children}
          </div>
        </div>
      </Container>
    </div>
  );
}
