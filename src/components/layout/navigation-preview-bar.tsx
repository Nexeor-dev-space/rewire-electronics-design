import Link from "next/link";
import { NAVIGATION_ADMIN_PATH, NAV_PREVIEW_PATH } from "@/lib/constants";

/** Shown on every storefront page while staff preview the navigation draft. */
export function NavigationPreviewBar() {
  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6">
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm text-ink shadow-(--shadow-float)">
        Navigation draft preview, not published
        <Link href={NAVIGATION_ADMIN_PATH} className="text-accent underline-offset-4 hover:underline">
          Back to Navigation
        </Link>
        {/* A route handler that clears the preview cookie, so a plain link. */}
        <a href={`${NAV_PREVIEW_PATH}?exit=1`} className="text-accent underline-offset-4 hover:underline">
          Exit preview
        </a>
      </p>
    </div>
  );
}
