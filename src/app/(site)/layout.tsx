import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

/**
 * Site chrome — header, footer, skip-link, `<main>` container, and the
 * phone's bottom tab bar.
 * Wraps every route inside `(site)` (home, product, cart, wishlist, …).
 * Reduced-chrome flows such as `/checkout` sit outside this group and
 * skip the chrome entirely — deliberately including the tab bar, since
 * mid-checkout navigation is exactly what that flow removes.
 */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Keyboard users can bypass the fixed header */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-void"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      {/* Bottom pad below `md` keeps the document's last content — the
          footer's legal line — clear of the fixed tab bar. On the
          wrapper rather than on `<main>`, because the footer is the
          element the bar actually overlaps. */}
      <div className="pb-16 md:pb-0">
        <Footer />
      </div>
      <MobileTabBar />
    </>
  );
}
