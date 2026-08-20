/**
 * IncludedList — a plain enumeration of what ships in the box.
 * No prices, no swatches; every line reads as a single object.
 */
export function IncludedList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 rounded-xl border border-line bg-surface px-5 py-4"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 size-5 shrink-0 text-accent"
          >
            <path d="M3 8.5h13l-1.6 8.4a2 2 0 0 1-2 1.6H6.6a2 2 0 0 1-2-1.6L3 8.5Z" />
            <path d="M8.25 8.5V6.75a3.75 3.75 0 0 1 7.5 0V8.5" />
          </svg>
          <span className="text-[0.9375rem] text-ink">{item}</span>
        </li>
      ))}
    </ul>
  );
}
