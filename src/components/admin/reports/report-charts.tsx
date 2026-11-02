"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { chartTicks, formatBucket, shareOf, type ReportBucketUnit } from "@/lib/reports";
import { cn } from "@/lib/utils";
import type { ReportCountRow } from "@/types/report";

/* Hand built rather than a chart library: the console needs one line and one
   bar, and every colour comes from the admin tokens. See docs/REPORTS.md. */

const MAX_X_LABELS = 6;
/** Past this share of the width the tooltip opens leftwards, so it stays inside the card. */
const TOOLTIP_FLIP_PERCENT = 70;

export function ReportStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-2 break-words text-2xl font-light text-ink">{value}</p>
      {note && <p className="mt-1.5 text-xs text-ink-secondary">{note}</p>}
    </div>
  );
}

/** Set `columns` to the tile count when it is four, so no tile is left alone on a row. */
export function ReportStats({ columns = 3, children }: { columns?: 3 | 4; children: ReactNode }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", columns === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
      {children}
    </div>
  );
}

export function ReportCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-medium text-ink">{title}</h2>
      {note && <p className="mt-1 text-xs text-ink-secondary">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One bar per part on one baseline, one hue, and every figure printed beside its bar. */
export function BreakdownBars({ rows }: { rows: readonly ReportCountRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const largest = Math.max(0, ...rows.map((row) => row.count));

  return (
    // Sized by its card, not the window: a bar in a narrow card sits under its label.
    <ul className="@container space-y-2.5">
      {rows.map((row) => (
        <li
          key={row.key}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 @md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_5rem]"
        >
          <span className="text-sm text-ink-secondary @md:col-start-1 @md:row-start-1">{row.label}</span>
          <span aria-hidden className="col-span-2 row-start-2 h-3 @md:col-span-1 @md:col-start-2 @md:row-start-1">
            {row.count > 0 && (
              <span
                className="block h-full rounded-r-xs bg-(--report-series)"
                style={{ width: `${(row.count / largest) * 100}%` }}
              />
            )}
          </span>
          <span className="text-right font-mono text-xs tabular-nums text-ink @md:col-start-3 @md:row-start-1">
            {row.count}
            <span className="ml-1.5 text-ink-secondary">{shareOf(row.count, total)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface TrendPoint {
  bucket: string;
  value: number;
}

interface TrendChartProps {
  /** What is plotted, for the axis summary and the table: "Net sales". */
  label: string;
  points: readonly TrendPoint[];
  unit: ReportBucketUnit;
  formatValue: (value: number) => string;
  /** The shorter form for axis ticks. Defaults to `formatValue`. */
  formatTick?: (value: number) => string;
}

/** A single series over time: a line with a crosshair and readout, and a table of the same figures. */
export function TrendChart({ label, points, unit, formatValue, formatTick = formatValue }: TrendChartProps) {
  const plot = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const ticks = chartTicks(Math.max(0, ...points.map((point) => point.value)));
  const top = ticks[ticks.length - 1];
  const lastIndex = points.length - 1;
  const xAt = (index: number) => (lastIndex > 0 ? (index / lastIndex) * 100 : 50);
  const yAt = (value: number) => 100 - (value / top) * 100;
  const line = points.map((point, index) => `${xAt(index)},${yAt(point.value)}`).join(" ");
  const labelEvery = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  const shown = active ?? lastIndex;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const box = plot.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setActive(Math.round(ratio * lastIndex));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowLeft" ? -1 : 1;
    setActive(Math.min(lastIndex, Math.max(0, shown + step)));
  }

  return (
    <figure className="m-0">
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2">
        <div aria-hidden className="relative h-48">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 font-mono text-[0.625rem] tabular-nums text-ink-secondary"
              style={{ top: `${yAt(tick)}%` }}
            >
              {formatTick(tick)}
            </span>
          ))}
        </div>

        <div
          ref={plot}
          role="group"
          tabIndex={0}
          aria-label={`${label} over time. Use the left and right arrow keys to read each point.`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(lastIndex)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
          className="relative h-48 touch-pan-y"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              aria-hidden
              className="absolute inset-x-0 h-px bg-line"
              style={{ top: `${yAt(tick)}%` }}
            />
          ))}

          {lastIndex > 0 && (
            <svg
              aria-hidden
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full overflow-visible text-(--report-series)"
            >
              <polygon points={`0,100 ${line} 100,100`} fill="currentColor" fillOpacity={0.1} />
              <polyline
                points={line}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {points.length > 0 && (
            <>
              {active !== null && (
                <span aria-hidden className="absolute inset-y-0 w-px bg-line-strong" style={{ left: `${xAt(active)}%` }} />
              )}
              <span
                aria-hidden
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--report-series) ring-2 ring-surface"
                style={{ left: `${xAt(shown)}%`, top: `${yAt(points[shown].value)}%` }}
              />
              {active !== null && (
                <div
                  role="status"
                  className={cn(
                    "pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-md border border-line bg-surface-3 px-2.5 py-1.5 shadow-soft",
                    xAt(active) > TOOLTIP_FLIP_PERCENT ? "-translate-x-full" : "translate-x-2",
                  )}
                  style={{ left: `${xAt(active)}%` }}
                >
                  <p className="text-sm text-ink">{formatValue(points[active].value)}</p>
                  <p className="text-xs text-ink-secondary">
                    {label}, {formatBucket(points[active].bucket, unit)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <span aria-hidden />
        <div aria-hidden className="relative mt-1.5 h-5">
          {points.map((point, index) =>
            index % labelEvery === 0 ? (
              <span
                key={point.bucket}
                className={cn(
                  "absolute whitespace-nowrap font-mono text-[0.625rem] tabular-nums text-ink-secondary",
                  // The end labels sit inside the plot, so they can't run past the card.
                  lastIndex === 0 && "-translate-x-1/2",
                  lastIndex > 0 && index === lastIndex && "-translate-x-full",
                  lastIndex > 0 && index > 0 && index < lastIndex && "-translate-x-1/2",
                  // Every other label on a phone, where six would run together.
                  index % (labelEvery * 2) !== 0 && "max-sm:hidden",
                )}
                style={{ left: `${xAt(index)}%` }}
              >
                {formatBucket(point.bucket, unit)}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-ink-secondary">View as table</summary>
        <div data-lenis-prevent className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="py-1.5 font-normal text-ink-secondary">{unit === "day" ? "Day" : "Month"}</th>
                <th className="py-1.5 text-right font-normal text-ink-secondary">{label}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.bucket} className="border-b border-line last:border-b-0">
                  <td className="py-1.5 text-ink-secondary">{formatBucket(point.bucket, unit)}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-ink">{formatValue(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export interface ReportColumn<Row> {
  label: string;
  /** Right aligned and in mono: the figures column. */
  numeric?: boolean;
  cell: (row: Row) => ReactNode;
}

export function ReportTable<Row>({
  columns,
  rows,
  rowKey,
}: {
  columns: readonly ReportColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {columns.map((column) => (
              <th
                key={column.label}
                className={cn("whitespace-nowrap py-2 pr-4 font-normal text-ink-secondary last:pr-0", column.numeric && "text-right")}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-b-0">
              {columns.map((column) => (
                <td
                  key={column.label}
                  className={cn("py-2 pr-4 text-ink last:pr-0", column.numeric && "text-right font-mono tabular-nums")}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
