import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
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
    ];
  },
};

export default nextConfig;
