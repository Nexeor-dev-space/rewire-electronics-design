/**
 * TrustBlocks — the four questions that follow the price on any
 * considered purchase: warranty, returns, delivery, support. Placeholder
 * copy is used deliberately; specific durations belong in policy pages
 * once Rewire commits to them, not invented here.
 */
const BLOCKS = [
  {
    title: "Warranty",
    detail:
      "Every device ships with the Rewire warranty, backed for the full term against defects that were not present at inspection.",
    icon: [
      "M12 2.6 4.9 5.5v5.6c0 4.4 2.9 8.2 7.1 9.3 4.2-1.1 7.1-4.9 7.1-9.3V5.5L12 2.6Z",
      "m8.9 11.9 2.2 2.2 4.3-4.5",
    ],
  },
  {
    title: "Returns",
    detail:
      "Change your mind after unboxing? Send it back — a returns label is already in the packaging and refunds settle to the original payment method.",
    icon: ["M20.25 12a8.25 8.25 0 1 1-2.6-6", "M20.25 3.75v4.5h-4.5"],
  },
  {
    title: "Delivery",
    detail:
      "Free tracked delivery across the UAE. Orders placed by 5pm ship the same day; you can watch it from the workshop door to yours.",
    icon: [
      "M3.25 7.5h9.5v9H3.25z",
      "M12.75 10.5h3.2l3.05 3v3h-6.25",
      "M6.75 19.4a1.85 1.85 0 1 1 0-3.7 1.85 1.85 0 0 1 0 3.7z",
      "M16.25 19.4a1.85 1.85 0 1 1 0-3.7 1.85 1.85 0 0 1 0 3.7z",
    ],
  },
  {
    title: "Support",
    detail:
      "Real people, based in Dubai. Reach us by email or live chat and expect a considered reply — never a template.",
    icon: [
      "M4 12a8 8 0 0 1 16 0v4a3 3 0 0 1-3 3h-1v-6h4",
      "M4 12v4a3 3 0 0 0 3 3h1v-6H4",
    ],
  },
];

export function TrustBlocks() {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {BLOCKS.map((block) => (
        <div
          key={block.title}
          className="flex flex-col gap-4 bg-surface p-6 sm:p-8"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6 text-ink"
          >
            {block.icon.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
          <div className="min-w-0">
            <p className="text-[1rem] font-medium text-ink">{block.title}</p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-secondary">
              {block.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
