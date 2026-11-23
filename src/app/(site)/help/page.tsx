import Link from "next/link";
import { HelpShell } from "@/components/help/help-shell";
import { formatGuideDate } from "@/components/help/guide-sections";
import { HELP_PAGE_PATH } from "@/lib/constants";
import { pageMetadata } from "@/lib/seo";
import { listGuides } from "@/services/help-guide.service";

export const metadata = pageMetadata({
  title: "Help guides",
  description: "Step by step guides to browsing, buying, tracking, returning and claiming warranty at Rewire Electronics.",
  path: HELP_PAGE_PATH,
});

export default async function HelpPage() {
  const guides = await listGuides("customer");

  return (
    <HelpShell
      title="Help guides"
      lede="Short, step by step guides for everything you can do on Rewire, from your first order to a warranty claim."
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`${HELP_PAGE_PATH}/${guide.slug}`}
              className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface-2 p-6 transition-[transform,border-color,background-color] duration-(--duration-base) ease-(--ease-out-expo) hover:-translate-y-1 hover:border-line-strong hover:bg-surface motion-reduce:hover:translate-y-0"
            >
              <span className="font-sans text-xl font-light tracking-[-0.02em] text-ink">{guide.title}</span>
              <span className="text-sm leading-relaxed text-ink-secondary">{guide.summary}</span>
              <span className="mt-auto pt-2 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
                Updated {formatGuideDate(guide.updatedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </HelpShell>
  );
}
