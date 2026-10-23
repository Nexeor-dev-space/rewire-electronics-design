import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface BreakdownAddOn {
  key: string;
  label: string;
  price: number;
  charged: boolean;
}

export function LineBreakdown({
  unitPrice,
  quantity,
  addOns,
  compact = false,
  className,
}: {
  unitPrice: number;
  quantity: number;
  addOns: BreakdownAddOn[];
  compact?: boolean;
  className?: string;
}) {
  if (addOns.length === 0) return null;

  const rows = [{ key: "item", label: "Item", price: unitPrice, charged: true }, ...addOns];
  const times = quantity > 1 ? ` × ${quantity}` : "";

  return (
    <dl
      className={cn(
        "flex flex-col",
        compact ? "mt-1.5 gap-0.5 text-[0.75rem]" : "mt-3 gap-1 text-[0.8125rem]",
        className,
      )}
    >
      {rows.map((row) => (
        <div key={row.key} className="flex items-baseline justify-between gap-3">
          <dt className={cn("min-w-0 truncate", row.charged ? "text-ink-secondary" : "text-ink-muted line-through")}>
            {row.label}
          </dt>
          <dd className="shrink-0 font-mono tabular-nums text-ink-muted">
            {row.charged ? `${formatMoney(row.price)}${times}` : "Not charged"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
