import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NavigationPreviewBar } from "@/components/layout/navigation-preview-bar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { NavigationProvider } from "@/components/providers/navigation-provider";
import { StorefrontCategoriesProvider } from "@/components/providers/storefront-categories-provider";
import { listStorefrontCategories } from "@/services/catalogue.service";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { NAV_PREVIEW_COOKIE } from "@/lib/constants";
import { getDraftPreviewNavigation, getPublishedNavigation } from "@/services/navigation.service";

export const dynamic = "force-dynamic";

/**
 * Site chrome — header, footer, skip-link, `<main>` container, and the
 * phone's bottom tab bar.
 * Wraps every route inside `(site)` (home, product, cart, wishlist, …).
 * Reduced-chrome flows such as `/checkout` sit outside this group and
 * skip the chrome entirely — deliberately including the tab bar, since
 * mid-checkout navigation is exactly what that flow removes.
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

  return (
    <StorefrontCategoriesProvider categories={categories}>
      <NavigationProvider navigation={navigation}>
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
      {/* Bottom pad below `lg` keeps the document's last content — the
          footer's legal line — clear of the fixed tab bar. On the
          wrapper rather than on `<main>`, because the footer is the
          element the bar actually overlaps. */}
      <div className="pb-16 lg:pb-0">
        <Footer navigation={navigation} />
      </div>
      <MobileTabBar />
      {previewing && <NavigationPreviewBar />}
      </NavigationProvider>
    </StorefrontCategoriesProvider>
  );
}
