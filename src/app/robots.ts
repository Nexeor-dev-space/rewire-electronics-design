import type { MetadataRoute } from "next";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import { absoluteUrl } from "@/lib/seo";

const PRIVATE_PATHS = ["/admin", "/api", "/account", "/cart", "/checkout"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", API_ENDPOINTS.media.detail("")], disallow: PRIVATE_PATHS },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
