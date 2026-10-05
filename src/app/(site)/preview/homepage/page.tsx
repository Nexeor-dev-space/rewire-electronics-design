import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomepageSections } from "@/components/home/homepage-sections";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { HOMEPAGE_BUILDER_PATH } from "@/lib/constants";
import { getHomepageSections } from "@/services/homepage.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Homepage preview",
  robots: { index: false, follow: false },
};

/**
 * The homepage draft, rendered with the real site chrome, for staff who can
 * edit it. Anyone else gets a 404, so the route doesn't reveal it exists.
 * See docs/HOMEPAGE-CMS.md.
 */
export default async function HomepagePreview() {
  const session = await getSession();
  if (!session || !hasPermission(session.user.permissions, PERMISSIONS.homepage)) notFound();

  const sections = await getHomepageSections("DRAFT");

  return (
    <>
      <HomepageSections sections={sections} />
      {/* Bottom, not top: the site header is fixed to the top. `bottom-20`
          clears the phone tab bar. */}
      <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
        <p className="flex items-center gap-3 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm text-ink shadow-(--shadow-float)">
          Draft preview, not published
          <Link href={HOMEPAGE_BUILDER_PATH} className="text-accent underline-offset-4 hover:underline">
            Back to the builder
          </Link>
        </p>
      </div>
    </>
  );
}
