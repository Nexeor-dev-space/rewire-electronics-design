import { Footer } from "@/components/layout/footer";
import { SiteChrome } from "@/components/layout/site-chrome";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { TrustFooter } from "@/components/checkout/trust-footer";
import { StorefrontCategoriesProvider } from "@/components/providers/storefront-categories-provider";
import { listStorefrontCategories } from "@/services/catalogue.service";

export const dynamic = "force-dynamic";

/**
 * Site chrome — header, footer, skip-link, `<main>` container, and the
 * phone's bottom tab bar.
 * Wraps every storefront route inside `(site)`, including the auth pages
 * and checkout. A new page gets the chrome by default; `SiteChrome` holds
 * the single exception, `/checkout`, which swaps in its reduced header and
 * trust footer.
 */
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const categories = await listStorefrontCategories();

  return (
    <StorefrontCategoriesProvider categories={categories}>
      {/* Keyboard users can bypass the fixed header */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-void"
      >
        Skip to content
      </a>
      <SiteChrome
        footer={<Footer />}
        checkoutHeader={<CheckoutHeader />}
        checkoutFooter={<TrustFooter />}
      >
        {children}
      </SiteChrome>
    </StorefrontCategoriesProvider>
  );
}
