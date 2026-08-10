import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The circular "N" badge is Next's development-only dev-tools indicator.
   * It is injected by `next dev`, never ships in a production build, and
   * is not part of the design — but at 375px there is no free corner for
   * it to sit in, so every position covers something. Switched off so
   * mobile design review is looking at the actual page. Restore it with
   * `devIndicators: { position: "bottom-right" }` if the build-status
   * affordance is wanted back; errors still surface as full overlays.
   */
  devIndicators: false,

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
