import type { SpecGroup } from "@/types";

/**
 * SpecTable — two columns per row, one row per spec, one group per heading.
 *
 * Groups sit side-by-side from `lg` so a wide viewport does not turn short
 * values (`1.6 kg`, `16GB unified`) into a strip of white space. Rows keep
 * the label/value grid but cap the value column so it reads as a column
 * rather than a line; hairline rules between rows only.
 */
export function SpecTable({ groups }: { groups: SpecGroup[] }) {
  return (
    <div className="grid gap-14 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-16">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="text-display-sm font-light text-ink">{group.title}</h3>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {group.rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-1 gap-2 py-3.5 sm:grid-cols-[minmax(0,8rem)_1fr] sm:items-baseline sm:gap-8 sm:py-4"
              >
                <dt className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink-muted">
                  {row.label}
                </dt>
                <dd className="text-[0.9375rem] text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
