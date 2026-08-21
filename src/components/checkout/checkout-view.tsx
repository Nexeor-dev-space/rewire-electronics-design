"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAccount } from "@/components/providers/account-provider";
import {
  discountAmount,
  findPromo,
  nextOrderNumber,
  persistOrder,
  resolveCheckoutLines,
  totalsFor,
  type PlacedOrder,
  type PromoCode,
} from "@/lib/checkout";
import { cn, formatPrice } from "@/lib/utils";
import { CheckoutProgress, type ProgressStep } from "./checkout-progress";
import { CheckoutSection } from "./checkout-section";
import { Field } from "./field";
import { OptionList, type OptionListItem } from "./option-list";
import { OrderSummary } from "./order-summary";

/**
 * CheckoutView — the whole flow on one page, real-cart-aware.
 *
 * Reads bag straight off the AccountProvider so the numbers agree with
 * whatever the shopper actually added; if the bag is empty, the page
 * shows an empty state rather than a phantom form. State (delivery,
 * payment, promo, form values) lives at the top of the tree so the
 * summary and the sticky mobile CTA both react in the same paint.
 *
 * The progress indicator is passive — it observes which section is on
 * screen rather than gating the flow. The page is still one long form
 * because a stepped wizard for a bag with two items is friction, not
 * clarity.
 */

interface Props {
  delivery: (OptionListItem & { price: number; estimate: string })[];
  payment: OptionListItem[];
  vatRate: number;
}

const EMIRATES = [
  "Abu Dhabi",
  "Ajman",
  "Dubai",
  "Fujairah",
  "Ras Al Khaimah",
  "Sharjah",
  "Umm Al Quwain",
];

const PROGRESS: ProgressStep[] = [
  { id: "contact", label: "Information" },
  { id: "delivery-address", label: "Delivery" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

export function CheckoutView({ delivery, payment, vatRate }: Props) {
  const { items, ready, user, clearCart } = useAccount();
  const lines = useMemo(() => resolveCheckoutLines(items), [items]);
  const totals = useMemo(() => totalsFor(lines), [lines]);

  const [deliveryId, setDeliveryId] = useState(delivery[0]?.value ?? "");
  const [paymentId, setPaymentId] = useState(payment[0]?.value ?? "");
  const [promo, setPromo] = useState<PromoCode | undefined>(undefined);
  const [placing, setPlacing] = useState(false);
  const [activeStep, setActiveStep] = useState<string>(PROGRESS[0].id);
  const [billingSame, setBillingSame] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const activeDelivery = useMemo(
    () => delivery.find((option) => option.value === deliveryId),
    [delivery, deliveryId],
  );
  const activePayment = useMemo(
    () => payment.find((option) => option.value === paymentId),
    [payment, paymentId],
  );

  const discount = discountAmount(totals.subtotal, promo);
  const discounted = Math.max(0, totals.subtotal - discount);
  const vat = Math.round(discounted * vatRate);
  const total = Math.max(0, discounted + (activeDelivery?.price ?? 0) + vat);

  /* ---------- Progress observer — section in view drives the pill. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const targets = PROGRESS.map((step) =>
      document.getElementById(step.id),
    ).filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveStep(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.5, 0.9] },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ready, lines.length]);

  const handleApplyPromo = (code: string): string | null => {
    const found = findPromo(code);
    if (!found) return "That code isn't valid.";
    setPromo(found);
    return null;
  };

  const handleRemovePromo = () => setPromo(undefined);

  const savedAddresses = useMemo(
    () =>
      user
        ? [
            {
              id: "home",
              label: "Home",
              name: user.name,
              line1: "18 Al Wasl Villas, Villa 12",
              city: "Dubai",
              emirate: "Dubai",
              phone: "+971 50 123 4567",
            },
          ]
        : [],
    [user],
  );

  useEffect(() => {
    if (savedAddresses.length && selectedAddressId === "new") {
      setSelectedAddressId(savedAddresses[0].id);
    }
  }, [savedAddresses, selectedAddressId]);

  const handlePlaceOrder = async (event?: FormEvent) => {
    event?.preventDefault();
    if (placing || !lines.length) return;

    const form = formRef.current;
    if (form && !form.reportValidity()) return;

    setPlacing(true);
    const data = form ? new FormData(form) : null;
    const emirate = data?.get("emirate")?.toString() || "Dubai";
    const savedAddr = savedAddresses.find((a) => a.id === selectedAddressId);
    const address = savedAddr
      ? {
          name: savedAddr.name,
          line1: savedAddr.line1,
          city: savedAddr.city,
          emirate: savedAddr.emirate,
          country: "United Arab Emirates",
          phone: savedAddr.phone,
        }
      : {
          name:
            [
              data?.get("first-name")?.toString(),
              data?.get("last-name")?.toString(),
            ]
              .filter(Boolean)
              .join(" ") || "Rewire customer",
          line1: data?.get("address-1")?.toString() || "",
          line2: data?.get("address-2")?.toString() || undefined,
          city: data?.get("city")?.toString() || "",
          emirate,
          country: "United Arab Emirates",
          postalCode: data?.get("postal")?.toString() || undefined,
          phone: data?.get("phone")?.toString() || "",
        };

    const order: PlacedOrder = {
      id: nextOrderNumber().toLowerCase(),
      number: nextOrderNumber(),
      placedAt: new Date().toISOString(),
      lines: lines.map((line) => ({
        slug: line.product.slug,
        name: line.product.name,
        variantLabel: line.variantLabel,
        condition: line.condition,
        grade: line.grade,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        imageUrl: line.product.images[0]?.url,
        imageAlt: line.product.images[0]?.alt,
        imageFit: line.product.images[0]?.fit,
      })),
      contact: {
        email: data?.get("email")?.toString() || "",
        phone: data?.get("phone")?.toString() || address.phone,
      },
      address,
      deliveryLabel: activeDelivery?.label ?? "",
      deliveryEstimate: activeDelivery?.estimate ?? "",
      deliveryPrice: activeDelivery?.price ?? 0,
      paymentLabel: activePayment?.label ?? "",
      promoCode: promo?.code,
      discount,
      subtotal: totals.subtotal,
      total,
      currency: totals.currency,
      locale: totals.locale,
    };

    // Simulate the processor round-trip; UX guidance is 700–900ms so the
    // spinner feels honest rather than instant-and-fake.
    window.setTimeout(() => {
      persistOrder(order);
      clearCart();
      router.push(`/checkout/success?order=${encodeURIComponent(order.number)}`);
    }, 850);
  };

  /* ---------- Empty bag ---------- */
  if (ready && lines.length === 0) {
    return <EmptyBag />;
  }

  return (
    <form
      ref={formRef}
      onSubmit={handlePlaceOrder}
      noValidate={false}
      className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter) py-8 pb-40 md:py-12 lg:pb-14"
    >
      {/* ---------- Progress ---------- */}
      <div className="mb-8 md:mb-12">
        <CheckoutProgress steps={PROGRESS} activeId={activeStep} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-16">
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

          {/* ---------- Mobile: compact order summary ---------- */}
          <OrderSummary
            lines={lines}
            totals={totals}
            deliveryLabel={activeDelivery?.label ?? "—"}
            deliveryPrice={activeDelivery?.price ?? 0}
            vatRate={vatRate}
            discount={discount}
            promo={promo}
            onApplyPromo={handleApplyPromo}
            onRemovePromo={handleRemovePromo}
            className="lg:hidden"
            compact
          />

          {/* ---------- 01. Contact ---------- */}
          <CheckoutSection
            id="contact"
            index="01"
            title="Contact information"
            description="We will send the order confirmation and tracking here."
            aside={
              !user && (
                <a
                  href="#"
                  className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
                >
                  Sign in
                </a>
              )
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
                defaultValue={user?.email}
              />
              <Field
                id="phone"
                label="Phone number *"
                type="tel"
                autoComplete="tel"
                required
                placeholder="+971 50 000 0000"
                hint="For delivery updates only."
              />
              <div className="col-span-6">
                <Checkbox
                  id="email-opt-in"
                  checked={emailOptIn}
                  onChange={setEmailOptIn}
                  label="Email me order updates"
                  hint="We'll only email you about this order — no marketing."
                />
              </div>
            </div>
          </CheckoutSection>

          {/* ---------- 02. Delivery address ---------- */}
          <CheckoutSection
            id="delivery-address"
            index="02"
            title="Delivery address"
            description="Where the parcel should arrive."
          >
            {savedAddresses.length > 0 && (
              <div className="mb-6">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
                  Saved addresses
                </p>
                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {savedAddresses.map((addr) => (
                    <li key={addr.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer flex-col gap-1 rounded-xl border p-4",
                          "transition-[border-color,background-color] duration-(--duration-fast)",
                          selectedAddressId === addr.id
                            ? "border-accent bg-accent/5"
                            : "border-line hover:border-line-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name="saved-address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-secondary">
                            {addr.label}
                          </span>
                          {selectedAddressId === addr.id && (
                            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-accent">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[0.9375rem] font-medium text-ink">
                          {addr.name}
                        </p>
                        <p className="text-[0.8125rem] text-ink-secondary">
                          {addr.line1}
                          <br />
                          {addr.city}, {addr.emirate}
                        </p>
                        <p className="text-[0.75rem] text-ink-muted">
                          {addr.phone}
                        </p>
                      </label>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={() => setSelectedAddressId("new")}
                      className={cn(
                        "flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4",
                        "text-[0.8125rem] font-medium",
                        "transition-[border-color,color] duration-(--duration-fast)",
                        selectedAddressId === "new"
                          ? "border-accent text-accent"
                          : "border-line text-ink-secondary hover:border-line-strong hover:text-ink",
                      )}
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className="size-3.5"
                      >
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                      Add new address
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {selectedAddressId === "new" && (
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
                  label="Apartment, suite, floor"
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
                <div className="col-span-6 sm:col-span-3">
                  <label
                    htmlFor="emirate"
                    className="eyebrow block cursor-pointer"
                  >
                    Emirate *
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="emirate"
                      name="emirate"
                      required
                      defaultValue="Dubai"
                      autoComplete="address-level1"
                      className={cn(
                        "h-12 w-full appearance-none rounded-md bg-surface pl-4 pr-10 text-sm text-ink",
                        "border border-line transition-colors duration-(--duration-fast)",
                        "hover:border-line-strong focus:border-accent focus:outline-none",
                      )}
                    >
                      {EMIRATES.map((emirate) => (
                        <option key={emirate}>{emirate}</option>
                      ))}
                    </select>
                    <svg
                      aria-hidden
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none absolute right-3.5 top-1/2 size-3 -translate-y-1/2 text-ink-muted"
                    >
                      <path d="m4 6 4 4 4-4" />
                    </svg>
                  </div>
                </div>
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
            )}
          </CheckoutSection>

          {/* ---------- 03. Delivery method ---------- */}
          <CheckoutSection
            id="delivery"
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
            <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-muted">
              Your order is carefully packed and fully tracked. You will get a
              tracking link the moment it leaves the workshop.
            </p>
          </CheckoutSection>

          {/* ---------- 04. Payment ---------- */}
          <CheckoutSection
            id="payment"
            index="04"
            title="Payment"
            description="All payments are processed on our provider's secure page. Rewire never stores your card details."
          >
            <OptionList
              name="payment-method"
              value={paymentId}
              onChange={setPaymentId}
              options={payment}
            />

            {paymentId === "card" && <CardFields />}

            <div className="mt-6 border-t border-line pt-5">
              <Checkbox
                id="billing-same"
                checked={billingSame}
                onChange={setBillingSame}
                label="Billing address same as delivery"
              />
              {!billingSame && (
                <div className="mt-5 grid grid-cols-6 gap-4 sm:gap-5">
                  <Field
                    id="billing-address-1"
                    label="Billing address *"
                    required
                    placeholder="Street, city, emirate"
                  />
                  <Field
                    id="billing-postal"
                    label="Billing postal code"
                    trailing="Optional"
                    span={3}
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-live">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M8.4 10.3V7.6a3.6 3.6 0 1 1 7.2 0v2.7" />
                <path d="M6.9 10.3h10.2a1.7 1.7 0 0 1 1.7 1.7v6a1.7 1.7 0 0 1-1.7 1.7H6.9a1.7 1.7 0 0 1-1.7-1.7v-6a1.7 1.7 0 0 1 1.7-1.7Z" />
              </svg>
              Secure payment · encrypted end-to-end
            </div>
          </CheckoutSection>

          {/* ---------- Review anchor ---------- */}
          <div id="review" className="scroll-mt-24">
            <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-6">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[0.75rem] uppercase tracking-[0.2em] text-ink-faint">
                    05
                  </span>
                  <div>
                    <h2 className="text-[1.25rem] font-medium text-ink sm:text-[1.375rem]">
                      Review &amp; place order
                    </h2>
                    <p className="mt-1 text-[0.8125rem] text-ink-secondary">
                      Everything checks out? Confirm your order on the right —
                      or use the sticky bar on mobile.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-3 border-t border-line pt-5 text-[0.875rem] text-ink-secondary sm:grid-cols-2">
                <ReviewRow
                  label="Delivery"
                  value={`${activeDelivery?.label ?? "—"} · ${activeDelivery?.estimate ?? ""}`}
                />
                <ReviewRow
                  label="Payment"
                  value={activePayment?.label ?? "—"}
                />
                <ReviewRow
                  label="Order total"
                  value={formatPrice(total, totals.currency, totals.locale)}
                  strong
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Right column: sticky summary (desktop) ---------- */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <OrderSummary
              lines={lines}
              totals={totals}
              deliveryLabel={activeDelivery?.label ?? "—"}
              deliveryPrice={activeDelivery?.price ?? 0}
              vatRate={vatRate}
              discount={discount}
              promo={promo}
              onApplyPromo={handleApplyPromo}
              onRemovePromo={handleRemovePromo}
              onPlaceOrder={handlePlaceOrder}
              placing={placing}
            />
          </div>
        </div>
      </div>

      {/* ---------- Sticky mobile CTA ---------- */}
      <StickyMobileCta
        placing={placing}
        total={total}
        currency={totals.currency}
        locale={totals.locale}
        onPlaceOrder={handlePlaceOrder}
      />
    </form>
  );
}

/* ============================================================
   Card fields — only rendered when Card is the selected method
   ============================================================ */

function CardFields() {
  return (
    <div className="mt-5 grid grid-cols-6 gap-4 rounded-xl border border-line bg-void/50 p-5 sm:gap-5">
      <Field
        id="card-number"
        label="Card number *"
        required
        placeholder="1234 5678 9012 3456"
        autoComplete="cc-number"
        inputMode="numeric"
      />
      <Field
        id="card-name"
        label="Name on card *"
        required
        autoComplete="cc-name"
      />
      <Field
        id="card-expiry"
        label="Expiry *"
        placeholder="MM / YY"
        required
        autoComplete="cc-exp"
        inputMode="numeric"
        span={3}
      />
      <Field
        id="card-cvv"
        label="CVV *"
        placeholder="•••"
        required
        autoComplete="cc-csc"
        inputMode="numeric"
        span={3}
      />
    </div>
  );
}

/* ============================================================
   Bits
   ============================================================ */

function Checkbox({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
          "transition-[background-color,border-color] duration-(--duration-fast)",
          checked
            ? "border-accent bg-accent"
            : "border-line-strong bg-surface hover:border-ink-muted",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
        )}
      >
        {checked && (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3 text-void"
          >
            <path d="M2.5 6.5l2.5 2.5 4.5-5" />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.875rem] text-ink">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[0.75rem] text-ink-muted">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

function ReviewRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0">
      <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums",
          strong ? "text-[0.9375rem] font-medium text-ink" : "text-ink-secondary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StickyMobileCta({
  placing,
  total,
  currency,
  locale,
  onPlaceOrder,
}: {
  placing: boolean;
  total: number;
  currency: string;
  locale: string;
  onPlaceOrder: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/95 backdrop-blur-xl px-(--spacing-gutter) py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={placing}
        aria-busy={placing || undefined}
        className={cn(
          "flex h-13 w-full items-center justify-between gap-3 rounded-full px-5",
          "bg-[#c2410c] text-[#f5f5f2] shadow-(--shadow-soft)",
          "text-[0.9375rem] font-medium",
          "transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
          "hover:bg-[#d9531c] active:scale-[0.99]",
          "disabled:pointer-events-none disabled:opacity-70",
          "h-12",
        )}
      >
        <span>{placing ? "Processing…" : "Place Order"}</span>
        <span className="tabular-nums">{formatPrice(total, currency, locale)}</span>
      </button>
    </div>
  );
}

function EmptyBag() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-6 px-(--spacing-gutter) py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-line text-ink-secondary">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <path d="M4.5 7.5h15l-1.2 12H5.7l-1.2-12z" />
          <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
        </svg>
      </div>
      <div>
        <h1 className="text-display-sm font-light text-ink">
          Nothing to check out.
        </h1>
        <p className="mt-3 text-base text-ink-secondary">
          Your bag is empty. Add something from the shop before you head to
          checkout.
        </p>
      </div>
      <Link
        href="/shop"
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6",
          "bg-[#c2410c] text-[#f5f5f2] text-sm font-medium",
          "transition-colors duration-(--duration-fast) hover:bg-[#d9531c]",
        )}
      >
        Browse the shop
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </Link>
    </div>
  );
}
