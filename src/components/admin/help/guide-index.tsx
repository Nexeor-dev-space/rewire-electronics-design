import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { formatGuideDate } from "@/components/help/guide-sections";
import { Badge } from "@/components/ui/badge";
import type { Guide, GuideAudience } from "@/lib/user-guides/types";

const INDEX_COPY: Record<GuideAudience, { title: string; description: string }> = {
  admin: {
    title: "Admin Guides",
    description: "Step by step help for each screen of the Admin Panel, in sidebar order.",
  },
  customer: {
    title: "Customer Guides",
    description: "How a shopper uses the website, to help you support them.",
  },
};

/** The index page: every guide of one audience, with its last updated date. */
export function GuideIndex({ audience, guides }: { audience: GuideAudience; guides: Guide[] }) {
  const copy = INDEX_COPY[audience];

  return (
    <AdminPage title={copy.title} description={copy.description}>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/admin/help/${audience}-guide/${guide.slug}`}
              className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface-2 p-5 transition-colors duration-(--duration-fast) hover:border-line-strong hover:bg-surface"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-ink">{guide.title}</span>
                {!guide.available && <Badge>Not yet available</Badge>}
              </span>
              <span className="text-sm leading-relaxed text-ink-secondary">{guide.summary}</span>
              <span className="mt-auto pt-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-muted">
                Updated {formatGuideDate(guide.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}
