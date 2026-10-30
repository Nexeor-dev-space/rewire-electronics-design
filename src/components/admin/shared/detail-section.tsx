import type { ReactNode } from "react";

/** A titled panel on an admin detail screen (Returns, Warranty & Claims). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 md:p-6">
      <h2 className="mb-4 text-base font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** One label and value pair inside a `<dl>`. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className="text-sm tabular-nums text-ink">{children}</dd>
    </div>
  );
}
