import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product placeholders ship as local SVGs during the foundation phase.
    // CSP below keeps SVG delivery safe (no scripts, forced attachment-free sandbox).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
