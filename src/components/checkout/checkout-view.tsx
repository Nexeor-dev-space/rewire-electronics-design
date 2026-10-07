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
import { z } from "zod";
import { useApplyCoupon, useGetCartQuote, useRemoveCoupon } from "@/hooks/use-cart";
import { useGetMe } from "@/hooks/use-auth";
import { apiFieldErrors } from "@/lib/api/api-client";
import { signInHref } from "@/lib/auth/next-path";
import { DELIVERY_METHOD_LABELS, DELIVERY_METHODS, formatEta, type DeliveryMethod } from "@/lib/delivery";
import { EMIRATES, emirateLabel, type Emirate } from "@/lib/emirates";
import { CURRENCY, LOCALE, formatMoney } from "@/lib/money";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import { nextOrderNumber, persistOrder, type PlacedOrder } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { checkoutInformationSchema } from "@/validators/checkout.validator";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { CheckoutProgress, type ProgressStep } from "./checkout-progress";
import { CheckoutSection, type CheckoutSectionState } from "./checkout-section";
import { Field } from "./field";
import { OptionList, type OptionListItem } from "./option-list";
import { OrderSummary } from "./order-summary";

interface Props {
  payment: OptionListItem[];
}

interface SavedAddress {
  id: string;
  label: string;
  name: string;
  line1: string;
  city: string;
  emirate: string;
  phone: string;
}

const STEPS: ProgressStep[] = [
  { id: "information", label: "Information" },
  { id: "delivery", label: "Delivery" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

const INFORMATION_STEP = 0;
const DELIVERY_STEP = 1;
const PAYMENT_STEP = 2;
const REVIEW_STEP = 3;

const INFORMATION_FIELDS = {
  email: "email",
  phone: "phone",
  firstName: "first-name",
  lastName: "last-name",
  address1: "address-1",
  address2: "address-2",
  city: "city",
  emirate: "emirate",
  postalCode: "postal",
} as const;

type InformationField = keyof typeof INFORMATION_FIELDS;
type InformationErrors = Partial<Record<InformationField, string>>;

const contactSchema = checkoutInformationSchema.pick({
  email: true,
  phone: true,
  emailOptIn: true,
});

function readInformation(form: HTMLFormElement, emailOptIn: boolean) {
  const data = new FormData(form);
  const values: Record<string, unknown> = { emailOptIn };
  for (const [field, id] of Object.entries(INFORMATION_FIELDS)) {
    values[field] = data.get(id) ?? undefined;
  }
  return values;
}

function toInformationErrors(error: z.ZodError): InformationErrors {
  const fieldErrors: Partial<Record<string, string[]>> = z.flattenError(error).fieldErrors;
  const errors: InformationErrors = {};
  for (const field of Object.keys(INFORMATION_FIELDS) as InformationField[]) {
    const message = fieldErrors[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}

type InformationCheck =
  | { summary: string; errors?: undefined }
  | { errors: InformationErrors; summary?: undefined };

function checkInformation(
  values: Record<string, unknown>,
  savedAddress: SavedAddress | undefined,
): InformationCheck {
  if (savedAddress) {
    const result = contactSchema.safeParse(values);
    if (!result.success) return { errors: toInformationErrors(result.error) };
    const { email, phone } = result.data;
    return { summary: [email, phone, `${savedAddress.city}, ${savedAddress.emirate}`].join(" · ") };
  }
  const result = checkoutInformationSchema.safeParse(values);
  if (!result.success) return { errors: toInformationErrors(result.error) };
  const { email, phone, city, emirate } = result.data;
  return { summary: [email, phone, `${city}, ${emirateLabel(emirate)}`].join(" · ") };
}

function formatFee(fee: number): string {
  return fee === 0 ? "Free" : formatMoney(fee);
}

export function CheckoutView({ payment }: Props) {
  const { data: me } = useGetMe();

  const [emirate, setEmirate] = useState<Emirate>("DUBAI");
  const [method, setMethod] = useState<DeliveryMethod>("STANDARD");
  const quote = useGetCartQuote(emirate, method);
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();

  const [paymentId, setPaymentId] = useState(payment[0]?.value ?? "");
  const [placing, setPlacing] = useState(false);
  const [openStep, setOpenStep] = useState(INFORMATION_STEP);
  const [informationSummary, setInformationSummary] = useState("");
  const [informationErrors, setInformationErrors] = useState<InformationErrors>({});
  const [billingSame, setBillingSame] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const paymentFieldsRef = useRef<HTMLDivElement>(null);

  const cart = quote.data?.cart;
  const lines = cart?.items ?? [];
  const stepsComplete = openStep === REVIEW_STEP;

  const deliveryOptions: OptionListItem[] = (quote.data?.options ?? []).map((option) => ({
    value: option.method,
    label: DELIVERY_METHOD_LABELS[option.method],
    supporting: formatEta(option.etaMinDays, option.etaMaxDays),
    trailing: formatFee(option.fee),
  }));

  const activeDeliveryOption = quote.data?.options.find((option) => option.method === method);
  const deliveryLabel = activeDeliveryOption
    ? `${DELIVERY_METHOD_LABELS[method]} · ${formatEta(activeDeliveryOption.etaMinDays, activeDeliveryOption.etaMaxDays)}`
    : DELIVERY_METHOD_LABELS[method];
  const deliverySummary = activeDeliveryOption
    ? `${deliveryLabel} · ${formatFee(activeDeliveryOption.fee)}`
    : deliveryLabel;

  const activePayment = useMemo(
    () => payment.find((option) => option.value === paymentId),
    [payment, paymentId],
  );

  const couponFieldError = applyCoupon.isError
    ? apiFieldErrors(applyCoupon.error).code?.[0] ?? applyCoupon.error.message
    : null;

  const savedAddresses = useMemo<SavedAddress[]>(
    () =>
      me
        ? [
            {
              id: "home",
              label: "Home",
              name: me.fullName,
              line1: "18 Al Wasl Villas, Villa 12",
              city: "Dubai",
              emirate: "Dubai",
              phone: "+971 50 123 4567",
            },
          ]
        : [],
    [me],
  );

  const savedAddress = savedAddresses.find((a) => a.id === selectedAddressId);

  useEffect(() => {
    if (savedAddresses.length && selectedAddressId === "new") {
      setSelectedAddressId(savedAddresses[0].id);
    }
  }, [savedAddresses, selectedAddressId]);

  const stepState = (step: number): CheckoutSectionState =>
    step === openStep ? "active" : step < openStep ? "done" : "locked";

  const editStep = (step: number) => {
    if (step < openStep && !placing) setOpenStep(step);
  };

  const chooseAddress = (id: string) => {
    setSelectedAddressId(id);
    setInformationErrors({});
  };

  const revalidateInformation = (field: InformationField) => {
    const form = formRef.current;
    if (!form || !informationErrors[field]) return;
    const check = checkInformation(readInformation(form, emailOptIn), savedAddress);
    setInformationErrors((current) => ({ ...current, [field]: check.errors?.[field] }));
  };

  const continueInformation = () => {
    const form = formRef.current;
    if (!form) return;
    const check = checkInformation(readInformation(form, emailOptIn), savedAddress);
    const errors = check.errors;
    if (errors) {
      setInformationErrors(errors);
      const firstInvalid = (Object.keys(INFORMATION_FIELDS) as InformationField[]).find(
        (field) => errors[field],
      );
      if (firstInvalid) document.getElementById(INFORMATION_FIELDS[firstInvalid])?.focus();
      return;
    }
    setInformationErrors({});
    setInformationSummary(check.summary);
    setOpenStep(DELIVERY_STEP);
  };

  const continueDelivery = () => setOpenStep(PAYMENT_STEP);

  const continuePayment = () => {
    const inputs = Array.from(paymentFieldsRef.current?.querySelectorAll("input") ?? []);
    const invalid = inputs.find((input) => !input.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setOpenStep(REVIEW_STEP);
  };

  const continueStep = [continueInformation, continueDelivery, continuePayment];

  const handlePlaceOrder = () => {
    if (placing || !cart || lines.length === 0 || !cart.canCheckout || !stepsComplete) return;

    const form = formRef.current;
    setPlacing(true);
    const data = form ? new FormData(form) : null;
    const address = savedAddress
      ? {
          name: savedAddress.name,
          line1: savedAddress.line1,
          city: savedAddress.city,
          emirate: savedAddress.emirate,
          country: "United Arab Emirates",
          phone: savedAddress.phone,
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
          emirate: emirateLabel(emirate),
          country: "United Arab Emirates",
          postalCode: data?.get("postal")?.toString() || undefined,
          phone: data?.get("phone")?.toString() || "",
        };

    const orderNumber = nextOrderNumber();
    const order: PlacedOrder = {
      id: orderNumber.toLowerCase(),
      number: orderNumber,
      placedAt: new Date().toISOString(),
      lines: lines.map((line) => ({
        slug: line.productSlug,
        name: line.productName,
        variantLabel: [line.storage, line.colour].filter(Boolean).join(" · "),
        condition: CONDITION_META[line.condition].label,
        grade: line.grade ? GRADE_META[line.grade].label : undefined,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        imageUrl: line.imageUrl ?? undefined,
        imageAlt: line.imageAlt,
        imageFit: "contain",
      })),
      contact: {
        email: data?.get("email")?.toString() || "",
        phone: data?.get("phone")?.toString() || address.phone,
      },
      address,
      deliveryLabel,
      deliveryEstimate: activeDeliveryOption
        ? formatEta(activeDeliveryOption.etaMinDays, activeDeliveryOption.etaMaxDays)
        : "",
      deliveryPrice: cart.totals.delivery ?? 0,
      paymentLabel: activePayment?.label ?? "",
      promoCode: cart.coupon?.valid ? cart.coupon.code : undefined,
      discount: cart.totals.discount,
      subtotal: cart.totals.subtotal,
      total: cart.totals.total,
      currency: CURRENCY,
      locale: LOCALE,
    };

    // Simulate the processor round-trip; UX guidance is 700–900ms so the
    // spinner feels honest rather than instant-and-fake. Real order
    // creation — and the transaction that empties the cart — is built
    // in Phase 5; today's mock flow leaves the cart as it is.
    window.setTimeout(() => {
      persistOrder(order);
      router.push(`/checkout/success?order=${encodeURIComponent(order.number)}`);
    }, 850);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (openStep === REVIEW_STEP) handlePlaceOrder();
    else continueStep[openStep]?.();
  };

  if (quote.isPending) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-(--spacing-gutter) py-16 text-center">
        <Spinner className="size-6 text-ink-secondary" />
        <p className="text-sm text-ink-secondary">Loading your cart…</p>
      </div>
    );
  }

  if (quote.isError) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-(--spacing-gutter) py-16 text-center">
        <p role="alert" className="text-sm text-ink-secondary">
          {quote.error.message}
        </p>
        <button
          type="button"
          onClick={() => quote.refetch()}
          className="text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
        >
          Try again
        </button>
      </div>
    );
  }

  if (lines.length === 0) {
    return <EmptyBag />;
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter) py-8 pb-40 md:py-12 lg:pb-14"
    >
      <div className="sticky top-16 z-30 -mx-(--spacing-gutter) mb-8 border-b border-line bg-void/95 px-(--spacing-gutter) py-3 backdrop-blur-xl md:top-20 md:mb-12">
        <CheckoutProgress steps={STEPS} activeIndex={openStep} onSelect={editStep} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-16">
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

          <OrderSummary
            cart={cart!}
            deliveryLabel={deliveryLabel}
            className="lg:hidden"
            compact
            quotePending={quote.isFetching}
          />

          <CheckoutSection
            id={STEPS[INFORMATION_STEP].id}
            index="01"
            title="Contact and address"
            description="We send the order confirmation and tracking to these details."
            state={stepState(INFORMATION_STEP)}
            summary={informationSummary}
            onEdit={() => editStep(INFORMATION_STEP)}
            aside={
              !me && (
                <a
                  href={signInHref("/checkout")}
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
                defaultValue={me?.email}
                error={informationErrors.email}
                onBlur={() => revalidateInformation("email")}
              />
              <Field
                id="phone"
                label="Phone number *"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="050 123 4567"
                hint="For delivery updates only."
                error={informationErrors.phone}
                onBlur={() => revalidateInformation("phone")}
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

            <div className="mt-8 border-t border-line pt-6">
              <h3 className="text-[1rem] font-medium tracking-tight text-ink">
                Delivery address
              </h3>
              <p className="mt-1 text-[0.8125rem] text-ink-secondary">
                Where the parcel should arrive.
              </p>

              {savedAddresses.length > 0 && (
                <div className="mt-5">
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
                            onChange={() => chooseAddress(addr.id)}
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
                        onClick={() => chooseAddress("new")}
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
                <div className="mt-5 grid grid-cols-6 gap-4 sm:gap-5">
                  <Field
                    id="first-name"
                    label="First name *"
                    autoComplete="given-name"
                    required
                    span={3}
                    error={informationErrors.firstName}
                    onBlur={() => revalidateInformation("firstName")}
                  />
                  <Field
                    id="last-name"
                    label="Last name *"
                    autoComplete="family-name"
                    required
                    span={3}
                    error={informationErrors.lastName}
                    onBlur={() => revalidateInformation("lastName")}
                  />
                  <Field
                    id="address-1"
                    label="Address *"
                    autoComplete="address-line1"
                    required
                    placeholder="Villa / apartment, building, street"
                    error={informationErrors.address1}
                    onBlur={() => revalidateInformation("address1")}
                  />
                  <Field
                    id="address-2"
                    label="Apartment, suite, floor"
                    autoComplete="address-line2"
                    trailing="Optional"
                    error={informationErrors.address2}
                    onBlur={() => revalidateInformation("address2")}
                  />
                  <Field
                    id="city"
                    label="City *"
                    autoComplete="address-level2"
                    required
                    span={3}
                    error={informationErrors.city}
                    onBlur={() => revalidateInformation("city")}
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
                        value={emirate}
                        onChange={(event) => setEmirate(event.target.value as Emirate)}
                        autoComplete="address-level1"
                        aria-invalid={informationErrors.emirate ? true : undefined}
                        aria-describedby={informationErrors.emirate ? "emirate-error" : undefined}
                        className={cn(
                          "h-12 w-full appearance-none rounded-md bg-surface pl-4 pr-10 text-sm text-ink",
                          "border border-line transition-colors duration-(--duration-fast)",
                          "hover:border-line-strong focus:border-accent focus:outline-none aria-invalid:border-danger",
                        )}
                      >
                        {EMIRATES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
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
                    <FieldError id="emirate-error" className="mt-1.5 text-[0.75rem]">
                      {informationErrors.emirate}
                    </FieldError>
                  </div>
                  <Field
                    id="postal"
                    label="Postal code"
                    autoComplete="postal-code"
                    trailing="Optional"
                    span={3}
                    error={informationErrors.postalCode}
                    onBlur={() => revalidateInformation("postalCode")}
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
            </div>

            <ContinueButton label="Continue to delivery" onClick={continueInformation} />
          </CheckoutSection>

          <CheckoutSection
            id={STEPS[DELIVERY_STEP].id}
            index="02"
            title="Delivery method"
            description="Pick the one that suits you — every option is tracked."
            state={stepState(DELIVERY_STEP)}
            summary={deliverySummary}
            onEdit={() => editStep(DELIVERY_STEP)}
          >
            <OptionList
              name="delivery-method"
              value={method}
              onChange={(value) => setMethod(value as DeliveryMethod)}
              options={
                deliveryOptions.length > 0
                  ? deliveryOptions
                  : DELIVERY_METHODS.map((value) => ({
                      value,
                      label: DELIVERY_METHOD_LABELS[value],
                    }))
              }
            />
            <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-muted">
              Your order is carefully packed and fully tracked. You will get a
              tracking link the moment it leaves the workshop.
            </p>

            <ContinueButton label="Continue to payment" onClick={continueDelivery} />
          </CheckoutSection>

          <CheckoutSection
            id={STEPS[PAYMENT_STEP].id}
            index="03"
            title="Payment"
            description="All payments are processed on our provider's secure page. Rewire never stores your card details."
            state={stepState(PAYMENT_STEP)}
            summary={activePayment?.label}
            onEdit={() => editStep(PAYMENT_STEP)}
          >
            <div ref={paymentFieldsRef}>
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

            <ContinueButton label="Continue to review" onClick={continuePayment} />
          </CheckoutSection>

          <CheckoutSection
            id={STEPS[REVIEW_STEP].id}
            index="04"
            title="Review and place order"
            description="Everything checks out? Place your order from the summary, or the bar at the bottom on mobile."
            state={stepState(REVIEW_STEP)}
          >
            <dl className="grid gap-3 text-[0.875rem] text-ink-secondary sm:grid-cols-2">
              <ReviewRow label="Delivery" value={deliveryLabel} />
              <ReviewRow
                label="Payment"
                value={activePayment?.label ?? "—"}
              />
              <ReviewRow
                label="Order total"
                value={formatMoney(cart!.totals.total)}
                strong
              />
            </dl>
          </CheckoutSection>
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-40">
            <OrderSummary
              cart={cart!}
              deliveryLabel={deliveryLabel}
              onApplyCoupon={(code) => applyCoupon.mutate({ code })}
              onRemoveCoupon={() => removeCoupon.mutate()}
              couponPending={applyCoupon.isPending || removeCoupon.isPending}
              couponFieldError={couponFieldError}
              onPlaceOrder={handlePlaceOrder}
              placing={placing}
              stepsComplete={stepsComplete}
              quotePending={quote.isFetching}
            />
          </div>
        </div>
      </div>

      <StickyMobileCta
        placing={placing}
        total={cart!.totals.total}
        canCheckout={cart!.canCheckout && stepsComplete}
        onPlaceOrder={handlePlaceOrder}
      />
    </form>
  );
}

function ContinueButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-8 flex justify-end">
      <Button type="button" onClick={onClick} className="w-full sm:w-auto">
        {label}
      </Button>
    </div>
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
  canCheckout,
  onPlaceOrder,
}: {
  placing: boolean;
  total: number;
  canCheckout: boolean;
  onPlaceOrder: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/95 backdrop-blur-xl px-(--spacing-gutter) py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <button
        type="button"
        onClick={onPlaceOrder}
        disabled={placing || !canCheckout}
        aria-busy={placing || undefined}
        className={cn(
          "flex h-13 w-full items-center justify-between gap-3 rounded-full px-5",
          "bg-accent text-white",
          "text-[0.9375rem] font-medium",
          "transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
          "hover:bg-accent-hover active:scale-[0.99]",
          "disabled:pointer-events-none disabled:opacity-70",
          "h-12",
        )}
      >
        <span>{placing ? "Processing…" : "Place Order"}</span>
        <span className="tabular-nums">{formatMoney(total)}</span>
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
          "bg-accent text-white text-sm font-medium",
          "transition-colors duration-(--duration-fast) hover:bg-accent-hover",
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
