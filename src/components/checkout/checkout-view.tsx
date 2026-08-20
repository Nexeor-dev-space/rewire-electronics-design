"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckoutSection } from "./checkout-section";
import { Field } from "./field";
import { OptionList, type OptionListItem } from "./option-list";
import { OrderSummary } from "./order-summary";
import type { CheckoutLine, CheckoutTotals } from "@/lib/checkout";

/**
 * CheckoutView — the whole flow on one page.
 *
 * State lives here because the order summary needs to react instantly:
 * pick a faster delivery and the total moves in the same paint. Sections
 * below are dumb about totals, so the "one number, one source" rule the
 * catalogue keeps for prices holds here too.
 *
 * Layout: a two-column grid from `lg` — form on the left, sticky summary
 * on the right. Below `lg` the summary collapses into a compact card
 * that sits above the CTA so a mobile shopper always sees what they are
 * paying without scrolling.
 */
interface Props {
  lines: CheckoutLine[];
  totals: CheckoutTotals;
  delivery: (OptionListItem & { price: number })[];
  payment: OptionListItem[];
}

export function CheckoutView({ lines, totals, delivery, payment }: Props) {
  const [deliveryId, setDeliveryId] = useState(delivery[0]?.value ?? "");
  const [paymentId, setPaymentId] = useState(payment[0]?.value ?? "");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  const activeDelivery = useMemo(
    () => delivery.find((option) => option.value === deliveryId),
    [delivery, deliveryId],
  );

  const handlePlaceOrder = () => {
    setPlacing(true);
    window.setTimeout(() => {
      setPlacing(false);
      setPlaced(true);
    }, 900);
  };

  return (
    <div className="mx-auto grid w-full max-w-[110rem] gap-8 px-(--spacing-gutter) py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-16">
      {/* ---------- Left column: form ---------- */}
      <div className="flex flex-col gap-6 lg:gap-8">
        <header>
          <p className="eyebrow">Secure checkout</p>
          <h1 className="mt-3 text-display-md font-light text-ink">
            Just a few details away.
          </h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-ink-secondary">
            Every field marked with an asterisk is required. Your details
            are used only to complete this order.
          </p>
        </header>

        {/* ---------- Mobile: order summary above the form ---------- */}
        <OrderSummary
          lines={lines}
          totals={totals}
          deliveryLabel={activeDelivery?.label ?? "—"}
          deliveryPrice={activeDelivery?.price ?? 0}
          discount={0}
          onPlaceOrder={handlePlaceOrder}
          placing={placing}
          className="lg:hidden"
          compact
        />

        {/* ---------- 1. Contact ---------- */}
        <CheckoutSection
          index="01"
          title="Contact"
          description="We will send the order confirmation and tracking here."
          aside={
            <a
              href="#"
              className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              Sign in
            </a>
          }
        >
          <div className="grid grid-cols-6 gap-4 sm:gap-5">
            <Field
              id="email"
              label="Email address *"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
            <Field
              id="phone"
              label="Mobile *"
              type="tel"
              autoComplete="tel"
              required
              placeholder="+971 50 000 0000"
              hint="For delivery updates only."
            />
          </div>
        </CheckoutSection>

        {/* ---------- 2. Delivery address ---------- */}
        <CheckoutSection
          index="02"
          title="Delivery address"
          description="Where the parcel should arrive."
        >
          <div className="grid grid-cols-6 gap-4 sm:gap-5">
            <Field
              id="first-name"
              label="First name *"
              autoComplete="given-name"
              required
              span={3}
            />
            <Field
              id="last-name"
              label="Last name *"
              autoComplete="family-name"
              required
              span={3}
            />
            <Field
              id="address-1"
              label="Address *"
              autoComplete="address-line1"
              required
              placeholder="Villa / apartment, building, street"
            />
            <Field
              id="address-2"
              label="Apartment, floor, etc."
              autoComplete="address-line2"
              trailing="Optional"
            />
            <Field
              id="city"
              label="City *"
              autoComplete="address-level2"
              required
              span={3}
            />
            <Field
              id="emirate"
              label="Emirate *"
              autoComplete="address-level1"
              required
              span={3}
            />
            <Field
              id="postal"
              label="Postal code"
              autoComplete="postal-code"
              trailing="Optional"
              span={3}
            />
            <Field
              id="country"
              label="Country / region"
              defaultValue="United Arab Emirates"
              readOnly
              span={3}
            />
          </div>
        </CheckoutSection>

        {/* ---------- 3. Delivery method ---------- */}
        <CheckoutSection
          index="03"
          title="Delivery method"
          description="Pick the one that suits you — every option is tracked."
        >
          <OptionList
            name="delivery-method"
            value={deliveryId}
            onChange={setDeliveryId}
            options={delivery}
          />
        </CheckoutSection>

        {/* ---------- 4. Payment ---------- */}
        <CheckoutSection
          index="04"
          title="Payment"
          description="You will enter card details on the next step, on our processor's secure page."
        >
          <OptionList
            name="payment-method"
            value={paymentId}
            onChange={setPaymentId}
            options={payment}
          />
        </CheckoutSection>

        {/* ---------- Mobile CTA ---------- */}
        <div className="flex flex-col gap-3 lg:hidden">
          {placed ? (
            <PlacedNotice />
          ) : (
            <Button
              size="lg"
              variant="primary"
              loading={placing}
              onClick={handlePlaceOrder}
              className="w-full"
            >
              Place Order
            </Button>
          )}
          <p className="text-[0.75rem] leading-relaxed text-ink-muted">
            By placing this order you agree to the Rewire terms of sale.
          </p>
        </div>
      </div>

      {/* ---------- Right column: sticky summary (desktop) ---------- */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          {placed ? (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <PlacedNotice />
            </div>
          ) : (
            <OrderSummary
              lines={lines}
              totals={totals}
              deliveryLabel={activeDelivery?.label ?? "—"}
              deliveryPrice={activeDelivery?.price ?? 0}
              discount={0}
              onPlaceOrder={handlePlaceOrder}
              placing={placing}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PlacedNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-live/10 p-4 text-[0.9375rem] text-ink">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 size-5 shrink-0 text-live"
      >
        <path d="m5 12 4.5 4.5L19 7" />
      </svg>
      <span>
        <span className="block font-medium text-ink">Order placed.</span>
        <span className="mt-1 block text-[0.8125rem] text-ink-secondary">
          A confirmation is on the way — this is a demo flow, so nothing has
          been charged.
        </span>
      </span>
    </div>
  );
}
