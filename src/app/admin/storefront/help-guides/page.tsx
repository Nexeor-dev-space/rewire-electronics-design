import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { formatGuideDate } from "@/components/help/guide-sections";
import { Badge } from "@/components/ui/badge";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { GUIDE_AUDIENCE_LABELS } from "@/lib/user-guides/catalogue";
import type { GuideAudience } from "@/lib/user-guides/types";
import { listGuides } from "@/services/help-guide.service";

export const metadata: Metadata = { title: "Help Guides" };

const AUDIENCES: GuideAudience[] = ["customer", "admin"];

export default async function HelpGuidesPage() {
  const session = await getSession();
  if (!session) return null;

  const { permissions } = session.user;
  if (!hasPermission(permissions, PERMISSIONS.helpGuides)) {
    return (
      <AdminPage title="Help Guides">
        <AdminEmptyState title="Access denied" description="Your role doesn't include Help Guides." />
      </AdminPage>
    );
  }

  const canEdit = hasPermission(permissions, PERMISSIONS.helpGuides, "EDIT");
  const groups = await Promise.all(AUDIENCES.map(async (audience) => ({ audience, guides: await listGuides(audience) })));

  return (
    <AdminPage
      title="Help Guides"
      description="The customer help pages on the storefront and the admin guides. Saving a change updates the guide straight away, with no deployment."
    >
      <div className="flex flex-col gap-8">
        {groups.map(({ audience, guides }) => (
          <section key={audience} aria-labelledby={`${audience}-heading`}>
            <h2 id={`${audience}-heading`} className="mb-3 text-lg font-medium tracking-tight text-ink">
              {GUIDE_AUDIENCE_LABELS[audience]}
            </h2>
            <div className="overflow-hidden rounded-xl border border-line">
              <ul>
                {guides.map((guide) => (
                  <li
                    key={guide.slug}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      {canEdit ? (
                        <Link
                          href={`/admin/storefront/help-guides/${audience}/${guide.slug}`}
                          className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                        >
                          {guide.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-ink">{guide.title}</p>
                      )}
                      <p className="mt-0.5 text-xs text-ink-muted">Updated {formatGuideDate(guide.updatedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!guide.available && <Badge>Not yet available</Badge>}
                      {guide.edited && <Badge variant="outline">Edited</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </AdminPage>
  );
}
