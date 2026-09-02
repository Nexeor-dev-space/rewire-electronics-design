import Link from "next/link";
import type { LegalDocument as LegalDocumentData } from "@/lib/legal";
import { supportContact } from "@/lib/support";
import { cn } from "@/lib/utils";

/**
 * LegalDocument — the shell both `/terms` and `/privacy` render.
 *
 * A server component with no motion. Every other editorial page on the
 * site opens with a clip-reveal, and these two deliberately do not: a
 * reader on a policy page is looking something up, usually having been
 * sent here by a link with an anchor on it, and animating the sentence
 * they came for is the wrong kind of theatre. The type, spacing and
 * hairlines are the same as the support page's; only the choreography
 * is gone.
 *
 * Layout is the site's standard two-column head — title left, lede set
 * against it at `lg` — then a contents rail of anchors, then the
 * sections themselves in one narrow measure. The measure is capped at
 * `65ch` because this is the only page on the site with real
 * paragraphs on it, and full-width prose at this size is unreadable.
 */
export function LegalDocument({ document }: { document: LegalDocumentData }) {
  const updated = new Date(document.updatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative overflow-hidden bg-void pb-(--spacing-section) pt-(--spacing-section)">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.05),transparent_70%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- Head ---------- */}
        <span className="eyebrow block">{document.eyebrow}</span>

        <div className="mt-9 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
          <h1 className="font-sans text-[clamp(2.5rem,5.4vw,5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink lg:col-span-7">
            {document.title}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end">
            {document.lede}
          </p>
        </div>

        <p className="mt-10 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          Last updated {updated}
        </p>

        {/* ---------- Draft notice ----------
            Said plainly rather than buried, and said on the page rather
            than only in the source. Placeholder copy that looks like a
            reviewed policy is worse than no page at all, because a
            reader has no way to tell the difference. */}
        {document.draft && (
          <p
            className={cn(
              "mt-6 max-w-2xl rounded-xl border border-line bg-surface-2 p-5",
              "text-[0.9375rem] leading-relaxed text-ink-secondary",
            )}
          >
            <span className="font-medium text-ink">Draft.</span> This text
            describes how Rewire actually operates, but it has not yet been
            through legal review. For anything you need to rely on, write
            to{" "}
            <a
              href={`mailto:${supportContact.email}`}
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-(--duration-fast) hover:text-accent"
            >
              {supportContact.email}
            </a>
            .
          </p>
        )}

        {/* ---------- Contents ----------
            Anchors, not navigation — every target is on this page. */}
        <nav aria-label="On this page" className="mt-14 border-t border-line pt-8 lg:mt-16">
          <ul className="grid grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {document.sections.map((section, i) => (
              <li key={section.id}>
                <Link
                  href={`#${section.id}`}
                  className={cn(
                    "group flex items-baseline gap-3 py-2 text-[0.9375rem] text-ink-secondary",
                    "transition-colors duration-(--duration-fast) hover:text-ink",
                  )}
                >
                  <span
                    aria-hidden
                    className="font-mono text-[0.6875rem] tabular-nums text-ink-faint transition-colors duration-(--duration-fast) group-hover:text-accent"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ---------- The document ---------- */}
        <div className="mt-16 max-w-[65ch] lg:mt-20">
          {document.sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              // Clears the fixed header when an anchor is followed.
              className="scroll-mt-32 border-t border-line pt-10 first:border-t-0 first:pt-0 [&+section]:mt-14"
            >
              <p
                aria-hidden
                className="font-mono text-[0.6875rem] tabular-nums tracking-[0.2em] text-ink-faint"
              >
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2
                id={`${section.id}-heading`}
                className="mt-4 font-sans text-[clamp(1.5rem,2.6vw,2rem)] font-light leading-[1.1] tracking-[-0.025em] text-ink"
              >
                {section.heading}
              </h2>
              <div className="mt-6 space-y-5">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="text-base leading-relaxed text-ink-secondary"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* ---------- Close ---------- */}
        <div className="mt-16 max-w-[65ch] border-t border-line pt-8 lg:mt-20">
          <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
            Warranty, shipping and returns are set out in full on the{" "}
            <Link
              href="/support"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-(--duration-fast) hover:text-accent"
            >
              support page
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
