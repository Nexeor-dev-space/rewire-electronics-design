import type { MetadataRoute } from "next";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import { absoluteUrl } from "@/lib/seo";
import { SEARCH_PAGE_PATH } from "@/lib/site";

const PRIVATE_PATHS = ["/admin", "/api", "/account", "/cart", "/checkout", SEARCH_PAGE_PATH];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", API_ENDPOINTS.media.detail("")], disallow: PRIVATE_PATHS },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
