/**
 * TrustFooter — a subtle, professional line at the foot of the checkout.
 *
 * Deliberately quiet: no logos of security vendors, no fictional
 * payment provider marks, no policy specifics that would need updating
 * every quarter. Three plain-language reassurances in the mono voice.
 */
const ITEMS: { label: string; icon: string[] }[] = [
  {
    label: "Encrypted end-to-end",
    icon: [
      "M8.4 10.3V7.6a3.6 3.6 0 1 1 7.2 0v2.7",
      "M6.9 10.3h10.2a1.7 1.7 0 0 1 1.7 1.7v6a1.7 1.7 0 0 1-1.7 1.7H6.9a1.7 1.7 0 0 1-1.7-1.7v-6a1.7 1.7 0 0 1 1.7-1.7Z",
    ],
  },
  {
    label: "Card details never stored on Rewire",
    icon: [
      "M3.75 8.25h16.5v9.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-9.5Z",
      "M3.75 11.25h16.5",
      "M7 15.25h3",
    ],
  },
  {
    label: "Every device covered by the Rewire warranty",
    icon: [
      "M12 2.6 4.9 5.5v5.6c0 4.4 2.9 8.2 7.1 9.3 4.2-1.1 7.1-4.9 7.1-9.3V5.5L12 2.6Z",
      "m8.9 11.9 2.2 2.2 4.3-4.5",
    ],
  },
];

export function TrustFooter() {
  return (
    <footer className="border-t border-line bg-void py-8">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 px-(--spacing-gutter) sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {ITEMS.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-[0.75rem] text-ink-secondary"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 shrink-0 text-ink-muted"
              >
                {item.icon.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
          © Rewire Electronics
        </p>
      </div>
    </footer>
  );
}
