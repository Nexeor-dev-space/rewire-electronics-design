import type { NextConfig } from "next";
import { siteConfig } from "./src/lib/site";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,

  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
      // Browsers and crawlers that ask for /favicon.ico directly get the brand mark.
      { source: "/favicon.ico", destination: siteConfig.favicon, permanent: false },

      { source: "/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },

      { source: "/support/warranty", destination: "/warranty", permanent: true },
      { source: "/support/shipping", destination: "/shipping", permanent: true },
      { source: "/support/faq", destination: "/faq", permanent: true },
      {
        source: "/support/returns",
        destination: "/returns-refunds-cancellation",
        permanent: true,
      },

      {
        source: "/returns",
        destination: "/returns-refunds-cancellation",
        permanent: true,
      },
      {
        source: "/refunds",
        destination: "/returns-refunds-cancellation",
        permanent: true,
      },

      { source: "/category/:slug", destination: "/collection/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
