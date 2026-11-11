"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CHECKOUT_PAGE_PATH, CHECKOUT_SUCCESS_PAGE_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { MobileTabBar } from "./mobile-tab-bar";

interface SiteChromeProps {
  footer: ReactNode;
  checkoutHeader: ReactNode;
  checkoutFooter: ReactNode;
  children: ReactNode;
}

/**
 * SiteChrome — the one place that decides which header, footer and bottom
 * tab bar a storefront page gets.
 *
 * Every page gets the full header, footer and tab bar by default. The only
 * exceptions are the purchase steps:
 *
 * 1. `/checkout` swaps in the reduced header and trust footer, no tab bar.
 * 2. `/checkout/success` keeps the full header and footer, no tab bar.
 */
export function SiteChrome({
  footer,
  checkoutHeader,
  checkoutFooter,
  children,
}: SiteChromeProps) {
  const pathname = usePathname();
  const isCheckout = pathname === CHECKOUT_PAGE_PATH;
  const showTabBar = !isCheckout && pathname !== CHECKOUT_SUCCESS_PAGE_PATH;

  return (
    <>
      {isCheckout ? checkoutHeader : <Header />}
      <main id="main" className="flex-1">
        {children}
      </main>
      {/* Bottom pad below `lg` keeps the footer's last line clear of the
          fixed tab bar, and is dropped when the bar is not shown. */}
      <div className={cn(showTabBar && "pb-16 lg:pb-0")}>
        {isCheckout ? checkoutFooter : footer}
      </div>
      {showTabBar && <MobileTabBar />}
    </>
  );
}
