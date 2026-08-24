import type { SupportChannelIcon } from "@/lib/support";

/**
 * Channel marks — the house icon convention: a 24×24 grid, one stroke
 * weight, no fills, round joins. Drawn here rather than pulled from a
 * set so the three sit on the same optical baseline as the category
 * glyphs in `navigation.ts`.
 */
const paths: Record<SupportChannelIcon, string[]> = {
  mail: [
    "M3.75 6.75h16.5v10.5H3.75z",
    "m3.75 7.5 8.25 5.25L20.25 7.5",
  ],
  chat: [
    "M4.75 5.25h14.5v10h-9l-4 3.25V15.25h-1.5z",
    "M8.5 10.25h7",
  ],
  track: [
    "M3.75 8.25h11.5v8.5H3.75z",
    "M15.25 11.25h2.75l2.25 2.75v2.75h-5z",
    "M7.5 16.75a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z",
    "M15.5 16.75a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z",
  ],
};

export function SupportIcon({ name }: { name: SupportChannelIcon }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
