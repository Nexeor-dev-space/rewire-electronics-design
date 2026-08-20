import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

/**
 * Site chrome — header, footer, skip-link, `<main>` container.
 * Wraps every route inside `(site)` (home, product, cart, wishlist, …).
 * Reduced-chrome flows such as `/checkout` sit outside this group and
 * skip the chrome entirely.
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
      <Footer />
    </>
  );
}
