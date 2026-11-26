"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { matchAdminRoute } from "@/lib/admin-nav";
import { adminGuideSlugFor } from "@/lib/user-guides/admin-guides";

/**
 * Opens the guide for the screen you are on. A nested screen (Trash, Products)
 * uses its parent's guide when it has none of its own. Hidden on the Help
 * screens and on any screen with no guide.
 */
export function HelpLink() {
  const match = matchAdminRoute(usePathname());
  if (!match || match.section.area === "help") return null;

  const slug = adminGuideSlugFor([match.item.key, match.parent?.key]);
  if (!slug) return null;

  return (
    <Link
      href={`/admin/help/admin-guide/${slug}`}
      className="text-xs text-ink-muted transition-colors duration-(--duration-fast) hover:text-ink"
    >
      Help for this screen
    </Link>
  );
}
