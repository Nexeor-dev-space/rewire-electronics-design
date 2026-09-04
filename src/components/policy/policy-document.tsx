import Link from "next/link";
import { supportContact } from "@/lib/support";
import { cn } from "@/lib/utils";
import type { PolicyData } from "@/lib/policy-types";
import { RichText } from "./rich-text";

export function PolicyDocument({ policy }: { policy: PolicyData }) {
  const updated = new Date(policy.updatedAt).toLocaleDateString("en-GB", {
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
        <span className="eyebrow block">{policy.eyebrow}</span>

        <div className="mt-9 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
          <h1 className="font-sans text-[clamp(2.5rem,5.4vw,5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink lg:col-span-7">
            {policy.title}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end">
            {policy.lede}
          </p>
        </div>

        <p className="mt-10 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          Last updated {updated}
        </p>

        {policy.draft && (
          <p
            className={cn(
              "mt-6 max-w-2xl rounded-xl border border-line bg-surface-2 p-5",
              "text-[0.9375rem] leading-relaxed text-ink-secondary",
            )}
          >
            <span className="font-medium text-ink">Draft.</span> This text
            describes how Rewire actually operates, but it has not yet been
            through legal review. For anything you need to rely on, write to{" "}
            <a
              href={`mailto:${supportContact.email}`}
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-(--duration-fast) hover:text-accent"
            >
              {supportContact.email}
            </a>
            .
          </p>
        )}

        {policy.blocks.length > 1 && (
          <nav
            aria-label="On this page"
            className="mt-14 border-t border-line pt-8 lg:mt-16"
          >
            <ul className="grid grid-cols-1 gap-x-10 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {policy.blocks.map((block, i) => (
                <li key={block.id}>
                  <Link
                    href={`#${block.anchor}`}
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
                    {block.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-16 lg:mt-20">
          {policy.blocks.map((block, i) => (
            <section
              key={block.id}
              id={block.anchor}
              aria-labelledby={`${block.anchor}-heading`}
              className={cn(
                "scroll-mt-32 grid gap-6 border-t border-line pt-10",
                "lg:grid-cols-12 lg:gap-8",
                "first:border-t-0 first:pt-0 [&+section]:mt-14",
              )}
            >
              <div className="lg:col-span-4">
                <p
                  aria-hidden
                  className="font-mono text-[0.6875rem] tabular-nums tracking-[0.2em] text-ink-faint"
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2
                  id={`${block.anchor}-heading`}
                  className="mt-4 font-sans text-[clamp(1.5rem,2.6vw,2rem)] font-light leading-[1.1] tracking-[-0.025em] text-ink lg:sticky lg:top-32"
                >
                  {block.title}
                </h2>
              </div>

              <div className="max-w-[65ch] lg:col-span-8">
                <RichText doc={block.content} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
