"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDropDate } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO, overlayFade } from "@/lib/motion";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import {
  findWaitlistVariant,
  getWaitlistImage,
  getWaitlistProducts,
} from "@/lib/waitlist";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Basic email shape check. Deliberately not RFC-perfect — the goal is
 * to catch typos and empty submits, not to reject unusual-but-legal
 * addresses. Server-side validation is the source of truth when the
 * endpoint lands.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * When supplied the modal opens with the device and variant fixed:
   * used by product-page CTAs that already know what the shopper is
   * looking at. When absent (the navbar entry, the section CTAs) the
   * two selects appear and the shopper picks.
   *
   * Both fields are required together: a product-page button that
   * knows the device but not the variant should either preselect a
   * default or leave `preselect` off entirely and let the shopper
   * choose. A half-preselect is worse than no preselect — it fixes
   * one dropdown and leaves the other empty.
   */
  preselect?: { productId: string; variantId: string };
}

/**
 * WaitlistModal — the drop registration surface, and the whole
 * registration.
 *
 * Two modes: general and preselected. General is called from anywhere
 * the shopper has *not* named a product — the navbar CTA, the section
 * invitations, the calendar's row-level Notify Me. The two dependent
 * selects appear and the shopper picks device + variant, and the launch
 * information appears beneath them once both are chosen. Preselected is
 * called from a product-specific surface (a device page, an upcoming-
 * drop card that already knows which product it is) — the selects
 * collapse into a plain dl of facts and the shopper goes straight to
 * email/phone/consent.
 *
 * The a11y contract is the shell's: labelled dialog role, Escape,
 * backdrop dismiss, focus moved in and restored on close, Tab cycling
 * held inside the panel, and the page behind locked from scrolling.
 * Native `<select>` on purpose — every user gets their platform's
 * keyboard model and their OS picker on touch, and no custom listbox
 * reproduces both cheaply.
 */
export function WaitlistModal({
  open,
  onClose,
  preselect,
}: WaitlistModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  const products = getWaitlistProducts();
  const isPreselected = !!preselect;

  const productId0 = preselect?.productId ?? "";
  const variantId0 = preselect?.variantId ?? "";

  // Field IDs — stable per instance, used to pair labels to controls
  // and to describe the consent row.
  const productSelectId = useId();
  const variantSelectId = useId();
  const emailId = useId();
  const phoneId = useId();
  const consentId = useId();

  const [mode, setMode] = useState<"form" | "submitting" | "success">("form");
  const [productId, setProductId] = useState(productId0);
  const [variantId, setVariantId] = useState(variantId0);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  // Variant shot when one exists, product shot otherwise — see the note
  // on `WaitlistVariant.image`.
  const previewImage = productId
    ? getWaitlistImage(productId, variantId || undefined)
    : undefined;

  const currentProduct = products.find((p) => p.id === productId);
  const currentVariant = findWaitlistVariant(productId, variantId);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit =
    mode === "form" &&
    !!currentProduct &&
    !!currentVariant &&
    emailValid &&
    consent;

  // Reset the form each time the modal opens. A returning shopper
  // should not find a stale entry in the field — the modal is small
  // and there is no back button. Preselect deps are unpacked to
  // primitives so a caller passing a fresh object literal every render
  // does not blow the state away.
  useEffect(() => {
    if (open) {
      setMode("form");
      setProductId(productId0);
      setVariantId(variantId0);
      setEmail("");
      setPhone("");
      setConsent(false);
    }
  }, [open, productId0, variantId0]);

  // Product change → clear the variant. Variant IDs are unique per
  // product so the previous selection could never be valid for the
  // new one, and letting a stale value linger would submit against
  // the wrong record.
  useEffect(() => {
    if (
      variantId &&
      currentProduct &&
      !currentProduct.variants.some((v) => v.id === variantId)
    ) {
      setVariantId("");
    }
  }, [productId, currentProduct, variantId]);

  // Lock the page and move focus into the panel while open.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";

    const id = window.setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.documentElement.style.overflow = "";
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  // On success, move focus to Done — a keyboard user should not have
  // to hunt for the way out after registering.
  useEffect(() => {
    if (mode === "success") {
      const id = window.setTimeout(() => doneRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [mode]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setMode("submitting");
    // Simulated round-trip. Wire to the real endpoint when the
    // waitlist API lands — the state machine and the success view
    // do not need to change, only this promise.
    await new Promise((r) => window.setTimeout(r, 650));
    setMode("success");
  }

  const productName = currentProduct?.name ?? "";
  const variantLabel = currentVariant?.label ?? "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="waitlist"
          className="fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center sm:p-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayFade}
          onKeyDown={handleKeyDown}
        >
          {/* Scrim */}
          <div
            aria-hidden
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="waitlist-title"
            aria-describedby="waitlist-desc"
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className={cn(
              // Wide rather than tall: the preview panel and the form sit
              // side by side from `sm`, which shortens the dialog even as
              // it widens it. A single 512px column made a seven-field
              // form scroll on a laptop.
              "relative w-full max-w-lg overflow-y-auto rounded-xl sm:max-w-3xl",
              // `max-h` + `overflow-y-auto` so a short-viewport landscape
              // phone can still scroll the form. `dvh` accounts for iOS
              // Safari's dynamic address-bar height.
              "max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]",
              "border border-line bg-surface shadow-(--shadow-float) focus:outline-none",
            )}
          >
            <div aria-hidden className="grain absolute inset-0" />

            <div className="relative sm:grid sm:grid-cols-[15rem_1fr] lg:grid-cols-[17rem_1fr]">
              {/* ---------- Preview ----------
                  Fills the width the form does not need. Below `sm` it
                  collapses to a strip so stacking does not double the
                  dialog's height. */}
              <DevicePreview
                image={previewImage}
                productName={productName}
                variantLabel={variantLabel}
                startsAt={currentVariant?.startsAt}
                units={currentVariant?.units}
                hasProduct={Boolean(currentProduct)}
              />

              <div className="p-7 sm:p-8 lg:p-9">
              <div className="flex items-start justify-between gap-6">
                <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-secondary">
                  Drop · Waitlist
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close waitlist"
                  className="-m-2 flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--duration-fast) hover:bg-black/5 hover:text-ink"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="size-4"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              {mode === "success" ? (
                <>
                  <h2
                    id="waitlist-title"
                    className="mt-6 font-sans text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.05] tracking-[-0.03em] text-ink"
                  >
                    You&rsquo;re on the list.
                  </h2>

                  {/* `role="status"` announces the confirmation to
                      assistive tech without stealing focus. Focus lands
                      on Done via the effect above. */}
                  <p
                    id="waitlist-desc"
                    role="status"
                    className="mt-4 text-sm leading-relaxed text-ink-secondary"
                  >
                    You&rsquo;re registered for the{" "}
                    <span className="text-ink">
                      {productName} — {variantLabel}
                    </span>{" "}
                    launch. We&rsquo;ll notify you when early access and
                    launch updates are available.
                  </p>

                  <button
                    ref={doneRef}
                    type="button"
                    onClick={onClose}
                    className={cn(
                      buttonVariants({ variant: "primary", size: "md" }),
                      "mt-8 w-full",
                    )}
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <h2
                    id="waitlist-title"
                    className="mt-6 font-sans text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.05] tracking-[-0.03em] text-ink"
                  >
                    Join the waitlist.
                  </h2>

                  <p
                    id="waitlist-desc"
                    className="mt-4 text-sm leading-relaxed text-ink-secondary"
                  >
                    Get launch reminders, early access notifications, and
                    exclusive drop updates.
                  </p>

                  {/* `noValidate` — validity is driven by React state so
                      the Submit affordance and the error styling stay in
                      agreement. Native validation would race the
                      controlled inputs and pop unstyled tooltips. */}
                  <form
                    noValidate
                    onSubmit={handleSubmit}
                    className="mt-7 flex flex-col gap-5"
                  >
                    {isPreselected ? null : (
                      <>
                        <div>
                          <Label htmlFor={productSelectId}>Device</Label>
                          <Select
                            id={productSelectId}
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            required
                            aria-required="true"
                            // Placeholder colouring: the empty option
                            // reads as muted, resolved products in ink.
                            isPlaceholder={productId === ""}
                            className="mt-2"
                          >
                            <option value="" disabled>
                              Select a device
                            </option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={variantSelectId}>Variant</Label>
                          <Select
                            id={variantSelectId}
                            value={variantId}
                            onChange={(e) => setVariantId(e.target.value)}
                            required
                            aria-required="true"
                            // Disabled until a product is chosen so the
                            // shopper cannot skip step one and land on
                            // an empty variant list.
                            disabled={!currentProduct}
                            isPlaceholder={variantId === ""}
                            className="mt-2"
                          >
                            <option value="" disabled>
                              {currentProduct
                                ? "Select a variant"
                                : "Select a device first"}
                            </option>
                            {currentProduct?.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </Select>
                        </div>

                      </>
                    )}

                    <div>
                      <Label htmlFor={emailId}>Email address</Label>
                      <Input
                        id={emailId}
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor={phoneId}>Phone number (optional)</Label>
                      <Input
                        id={phoneId}
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    {/* Custom checkbox: a real `<input>` under the hood
                        (accessible, form-serialisable, keyboard-toggled)
                        with a peer-checked square drawn beside it. The
                        native box is `sr-only`, not `hidden`, so screen
                        readers and Tab still reach it. */}
                    <label
                      htmlFor={consentId}
                      className="flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-relaxed text-ink-secondary"
                    >
                      <input
                        id={consentId}
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "mt-[0.125rem] grid size-4 shrink-0 place-items-center rounded-sm border border-line-strong bg-surface",
                          "transition-[background-color,border-color] duration-(--duration-fast)",
                          "peer-hover:border-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40",
                          "peer-checked:border-ink peer-checked:bg-ink",
                        )}
                      >
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={cn(
                            "size-3 text-surface opacity-0 transition-opacity duration-(--duration-fast)",
                            "peer-checked:opacity-100",
                          )}
                        >
                          <path d="M2.5 6.25 5 8.75l4.5-5" />
                        </svg>
                      </span>
                      I agree to receive launch and product updates.
                    </label>

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      aria-disabled={!canSubmit}
                      className={cn(
                        buttonVariants({ variant: "accent", size: "md" }),
                        "group/cta mt-1 w-full",
                      )}
                    >
                      {mode === "submitting" ? (
                        "Joining…"
                      ) : (
                        <>
                          Join the waitlist
                          <svg
                            aria-hidden
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={cn(
                              "size-3.5 shrink-0 transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                              "motion-safe:group-hover/cta:translate-x-1",
                            )}
                          >
                            <path d="M3 8h10M9 4l4 4-4 4" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The dl of drop facts. In preselect mode this shows all four rows
 * (device, variant, launches on, availability); in general mode the
 * device and variant rows are hidden because the two selects above
 * already carry them, and only the launch date + availability appear
 * once a variant is chosen.
 */
/**
 * DevicePreview — the dialog's left half.
 *
 * Answers "what am I signing up for?" with the object itself rather than
 * two lines of text. Empty until a device is chosen, because a stand-in
 * silhouette for a product you have not picked is noise; once chosen the
 * render appears and the launch facts fill in beneath it as the variant
 * resolves.
 *
 * Below `sm` it collapses from a panel to a strip. Stacking a square
 * product plate on top of a seven-field form would have made the dialog
 * taller than the screen — the one thing this redesign had to avoid.
 */
function DevicePreview({
  image,
  productName,
  variantLabel,
  startsAt,
  units,
  hasProduct,
}: {
  image?: { url: string; alt: string };
  productName: string;
  variantLabel: string;
  startsAt?: string;
  units?: number;
  hasProduct: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-line bg-void p-6",
        // Centred rather than top-aligned: the form column is the taller
        // of the two, and a preview pinned to the top leaves a third of
        // the panel visibly empty underneath it.
        "sm:flex-col sm:items-stretch sm:justify-center sm:gap-0 sm:border-b-0 sm:border-r sm:p-8",
      )}
    >
      <div
        className={cn(
          "relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface",
          "sm:aspect-square sm:size-auto sm:w-full sm:rounded-xl",
        )}
      >
        {image ? (
          <Image
            key={image.url}
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 64px, 17rem"
            className="object-contain p-2 sm:p-6"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-ink-faint"
          >
            No device
          </span>
        )}
      </div>

      <div className="min-w-0 sm:mt-6">
        <p className="truncate text-[0.9375rem] font-medium text-ink sm:text-base">
          {hasProduct ? productName : "Select a device"}
        </p>
        <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
          {variantLabel || (hasProduct ? "Select a variant" : "\u2014")}
        </p>
      </div>

      {/* Facts only once a variant resolves them — an empty
          "Launches on —" row is worse than air. Desktop only: on the
          strip there is nowhere to put them without adding height. */}
      {startsAt && (
        <dl className="hidden sm:mt-6 sm:block">
          <div className="flex items-baseline justify-between gap-3 border-t border-line py-2.5">
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
              Launches
            </dt>
            <dd className="text-[0.8125rem] text-ink-secondary">
              {formatDropDate(startsAt)}
            </dd>
          </div>
          {typeof units === "number" && (
            <div className="flex items-baseline justify-between gap-3 border-t border-line py-2.5">
              <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                Allocation
              </dt>
              <dd className="text-[0.8125rem] text-ink-secondary">
                {units} devices
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

/**
 * A styled native `<select>`. Same shape as `Input` — border, radius,
 * focus ring — plus a chevron overlaid on the right so the platform's
 * default arrow can be hidden by `appearance-none` without leaving the
 * control looking like a text field. Native so it inherits keyboard
 * navigation, form-submit serialisation, and the OS picker on touch.
 */
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Colour the value in `ink-muted` while no real option is chosen. */
  isPlaceholder?: boolean;
};

function Select({
  className,
  isPlaceholder,
  children,
  ...props
}: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className={cn(
          "h-12 w-full appearance-none rounded-md bg-surface text-sm",
          "border border-line px-4 pr-10",
          "transition-[border-color,background-color,color] duration-(--duration-fast) ease-(--ease-out-quart)",
          "hover:border-line-strong",
          "focus:border-accent focus:outline-none",
          "aria-invalid:border-danger",
          "disabled:pointer-events-none disabled:opacity-40",
          isPlaceholder ? "text-ink-muted" : "text-ink",
        )}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2 text-ink-muted"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" />
      </svg>
    </div>
  );
}
