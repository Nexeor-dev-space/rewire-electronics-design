import { cn, formatPrice, savingsPercent } from "@/lib/utils";

interface PriceBlockProps {
  price: number;
  originalPrice: number;
  currency: string;
  locale: string;
  /** `display` for the phone/tablet identity, `panel` for the ledger. */
  scale?: "display" | "panel";
  className?: string;
}

/**
 * PriceBlock — the number that closes the sale.
 *
 * Ranked second only to the photograph, which is why it is set at display
 * scale in `urgent` while the strike-through and the saving stay small:
 * the eye should land on what the device costs *now*, and only then learn
 * what it used to. The two figures are printed from the same pair the
 * percentage is derived from, so the discount can never drift out of
 * agreement with the prices beside it.
 *
 * Restraint is doing the work here. There is no badge, no pill, no
 * strike-through in red and no "MRP" — the saving is one line of mono
 * beside a struck figure, which is how a premium retailer states a
 * reduction and how a discount site never does.
 *
 * Shared between the identity block and the panel on purpose: the phone
 * and the desktop ledger cannot show different money for the same device.
 */
export function PriceBlock({
  price,
  originalPrice,
  currency,
  locale,
  scale = "display",
  className,
}: PriceBlockProps) {
  const saving = savingsPercent(price, originalPrice);

  return (
    <div className={className}>
      <p
        className={cn(
          "font-light leading-none tracking-[-0.035em] tabular-nums text-urgent",
          scale === "display" ? "text-[2.25rem]" : "text-[2rem]",
        )}
      >
        {formatPrice(price, currency, locale)}
      </p>

      <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-[0.75rem] tabular-nums">
        {/* `<s>` alone is silent in most screen readers, so the
            relationship is spelled out for them rather than implied. */}
        <span className="sr-only">Was </span>
        <s className="text-ink-muted">
          {formatPrice(originalPrice, currency, locale)}
        </s>
        {saving > 0 && (
          <span className="uppercase tracking-[0.14em] text-urgent">
            {saving}% off
          </span>
        )}
      </p>
    </div>
  );
}
