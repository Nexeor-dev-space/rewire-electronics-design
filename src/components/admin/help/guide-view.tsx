import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { buttonVariants } from "@/components/ui/button";
import { GuideBody } from "@/components/help/guide-sections";
import type { Guide } from "@/lib/user-guides/types";

/** One guide as an admin page. `canEdit` adds a link to the Help Guides editor. */
export function GuideView({ guide, canEdit }: { guide: Guide; canEdit: boolean }) {
  return (
    <AdminPage
      title={guide.title}
      description={guide.summary}
      actions={
        canEdit ? (
          <Link
            href={`/admin/storefront/help-guides/${guide.audience}/${guide.slug}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Edit this guide
          </Link>
        ) : undefined
      }
    >
      <GuideBody guide={guide} stickyClassName="lg:top-20" />
    </AdminPage>
  );
}
