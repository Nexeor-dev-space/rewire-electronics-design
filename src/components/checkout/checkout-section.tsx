import type { ReactNode } from "react";

/**
 * CheckoutSection — the five-panel scaffold shared by contact, delivery,
 * delivery-method, and payment. A stepless flow: every field is on one
 * long page so a shopper never wonders how many screens remain.
 *
 * The `id` on the section anchors the progress indicator's observer so
 * the pill in the header tracks whichever chapter the reader is in.
 * The number is decorative but load-bearing — it signals order without
 * turning the page into a wizard.
 */
interface Props {
  id: string;
  index: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function CheckoutSection({
  id,
  index,
  title,
  description,
  aside,
  children,
}: Props) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="rounded-2xl border border-line bg-surface p-6 sm:p-8"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-5">
        <div className="flex items-baseline gap-4">
          <span
            aria-hidden
            className="font-mono text-[0.75rem] uppercase tracking-[0.2em] text-ink-faint"
          >
            {index}
          </span>
          <div>
            <h2
              id={`${id}-heading`}
              className="text-[1.25rem] font-medium leading-tight tracking-[-0.015em] text-ink sm:text-[1.375rem]"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[0.8125rem] text-ink-secondary">
                {description}
              </p>
            )}
          </div>
        </div>
        {aside && <div className="text-[0.8125rem]">{aside}</div>}
      </header>
      <div className="pt-6">{children}</div>
    </section>
  );
}
