import { Footer } from "@/components/layout/footer";
import { SiteChrome } from "@/components/layout/site-chrome";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { TrustFooter } from "@/components/checkout/trust-footer";
import { cookies } from "next/headers";
import { NavigationPreviewBar } from "@/components/layout/navigation-preview-bar";
import { NavigationProvider } from "@/components/providers/navigation-provider";
import { StorefrontCategoriesProvider } from "@/components/providers/storefront-categories-provider";
import { listStorefrontCategories } from "@/services/catalogue.service";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { NAV_PREVIEW_COOKIE } from "@/lib/constants";
import {
  getDraftPreviewNavigation,
  getPublishedNavigation,
  listHeaderDrops,
} from "@/services/navigation.service";

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
  // Only a browser that started a preview carries the cookie, so ordinary
  // visitors never cost a session read. The cookie alone grants nothing: the
  // permission is checked here.
  const wantsPreview = (await cookies()).has(NAV_PREVIEW_COOKIE);
  const session = wantsPreview ? await getSession() : null;
  const previewing = Boolean(
    session && hasPermission(session.user.permissions, PERMISSIONS.navigation),
  );

  const [categories, navigation] = await Promise.all([
    listStorefrontCategories(),
    previewing ? getDraftPreviewNavigation() : getPublishedNavigation(),
  ]);
  // The drops cost a query, so skip it when staff hid the Upcoming Drops menu.
  const dropsShown = navigation.header.rail.some((item) => item.id === "drops");
  const drops = dropsShown ? await listHeaderDrops().catch(() => []) : [];

  return (
    <StorefrontCategoriesProvider categories={categories}>
      <NavigationProvider navigation={navigation} drops={drops}>
      {/* Keyboard users can bypass the fixed header */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-void"
      >
        Skip to content
      </a>
      <SiteChrome
        footer={<Footer navigation={navigation} />}
        checkoutHeader={<CheckoutHeader />}
        checkoutFooter={<TrustFooter />}
      >
        {children}
      </SiteChrome>
      {previewing && <NavigationPreviewBar />}
      </NavigationProvider>
    </StorefrontCategoriesProvider>
  );
}
