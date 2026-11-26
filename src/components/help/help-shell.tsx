import type { ReactNode } from "react";

/** The storefront frame for a help page: eyebrow, title and lede over the page content. */
export function HelpShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  // overflow-clip, not hidden: hidden would stop the contents list from sticking.
  return (
    <div className="relative overflow-clip bg-void pb-(--spacing-section) pt-(--spacing-section)">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.05),transparent_70%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <span className="eyebrow block">Help</span>

        <div className="mt-5 grid gap-4 lg:mt-9 lg:grid-cols-12 lg:items-end lg:gap-6">
          <h1 className="break-words font-sans text-[clamp(2rem,5.4vw,5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink lg:col-span-7">
            {title}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:max-w-md lg:justify-self-end">
            {lede}
          </p>
        </div>

        <div className="mt-8 sm:mt-14">{children}</div>
      </div>
    </div>
  );
}
