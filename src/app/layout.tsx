import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "refurbished electronics",
    "certified renewed",
    "limited drops",
    "premium tech",
  ],
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // Matches `--color-void` — the mobile status-bar and tab-strip pick this
  // up on iOS/Android, so the OS chrome flows into the page ground rather
  // than flashing an off-white band above a dark canvas on scroll.
  themeColor: "#282929",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout — the html/body shell and app-wide providers only.
 *
 * The site chrome (header, footer, skip-link, `<main id="main">`) lives
 * in the `(site)` route group's layout so it wraps every marketing and
 * shop page. Reduced-chrome flows — checkout, in the first instance —
 * sit outside that group and bring their own header, keeping the visitor
 * focused on the one action the page is asking of them.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
