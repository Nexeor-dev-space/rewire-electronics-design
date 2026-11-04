"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGetMe } from "@/hooks/use-auth";
import { useJoinWaitlist } from "@/hooks/use-waitlist";
import { apiFieldErrors } from "@/lib/api/api-client";
import { DURATION, EASE_OUT_EXPO, overlayFade } from "@/lib/motion";
import { POLICY_ROUTES } from "@/lib/policy-types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const HEADING_CLASS =
  "mt-6 font-sans text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.05] tracking-[-0.03em] text-ink";

export interface WaitlistRelease {
  slug: string;
  title: string;
}

interface WaitlistModalProps {
  release: WaitlistRelease | null;
  onClose: () => void;
}

export function WaitlistModal({ release, onClose }: WaitlistModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const open = release !== null;

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

  return (
    <AnimatePresence>
      {release && (
        <motion.div
          key="waitlist"
          className="fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center sm:p-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayFade}
          onKeyDown={handleKeyDown}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            data-lenis-prevent
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className={cn(
              "relative w-full max-w-lg overflow-y-auto rounded-xl",
              "max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]",
              "border border-line bg-surface-3 shadow-(--shadow-float) focus:outline-none",
            )}
          >
            <div aria-hidden className="grain absolute inset-0" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.04),transparent)]"
            />

            <div className="relative p-7 sm:p-8 lg:p-9">
              <div className="flex items-start justify-between gap-6">
                <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-secondary">
                  Drop · Waitlist
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close waitlist"
                  className="-m-2 flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--duration-fast) hover:bg-white/5 hover:text-ink"
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

              <WaitlistForm release={release} titleId={titleId} descId={descId} onClose={onClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WaitlistForm({
  release,
  titleId,
  descId,
  onClose,
}: {
  release: WaitlistRelease;
  titleId: string;
  descId: string;
  onClose: () => void;
}) {
  const id = useId();
  const me = useGetMe();
  const join = useJoinWaitlist();
  const doneRef = useRef<HTMLButtonElement>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const status = join.data?.status;

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => doneRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [status]);

  const emailValue = email ?? me.data?.email ?? "";
  const phoneValue = phone ?? me.data?.phone ?? "";
  const errors = apiFieldErrors(join.error);
  const formError = join.isError && Object.keys(errors).length === 0 ? join.error.message : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    join.mutate({
      slug: release.slug,
      email: emailValue,
      emailOptIn,
      whatsappOptIn,
      phone: whatsappOptIn ? phoneValue : null,
    });
  }

  if (status) {
    return (
      <>
        <h2 id={titleId} className={HEADING_CLASS}>
          {status === "CONFIRMED" ? (
            <>You&rsquo;re on the list for {release.title}</>
          ) : (
            "Check your inbox to confirm"
          )}
        </h2>
        <p id={descId} role="status" className="mt-4 text-sm leading-relaxed text-ink-secondary">
          {status === "CONFIRMED" ? (
            "We’ll keep you posted. You can change how we reach you any time in your account."
          ) : (
            <>
              If this address still needs confirming, a link is on its way. Open it to secure your
              place for <span className="text-ink">{release.title}</span>.
            </>
          )}
        </p>
        <button
          ref={doneRef}
          type="button"
          onClick={onClose}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-8 w-full")}
        >
          Done
        </button>
      </>
    );
  }

  return (
    <>
      <h2 id={titleId} className={HEADING_CLASS}>
        Join the waitlist.
      </h2>
      <p id={descId} className="mt-4 text-sm leading-relaxed text-ink-secondary">
        Launch reminders and updates for <span className="text-ink">{release.title}</span>.
      </p>

      <form noValidate onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
        <div>
          <Label htmlFor={`${id}-email`}>Email address</Label>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Enter your email address"
            value={emailValue}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            className="mt-2"
          />
          <FieldError className="mt-2">{errors.email?.[0]}</FieldError>
        </div>

        <Checkbox id={`${id}-email-updates`} checked={emailOptIn} onChange={setEmailOptIn}>
          Email me updates
        </Checkbox>

        <Checkbox id={`${id}-whatsapp-updates`} checked={whatsappOptIn} onChange={setWhatsappOptIn}>
          WhatsApp updates
        </Checkbox>

        {whatsappOptIn && (
          <div>
            <Label htmlFor={`${id}-phone`}>WhatsApp number</Label>
            <Input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="050 123 4567"
              value={phoneValue}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={errors.phone ? true : undefined}
              className="mt-2"
            />
            <FieldError className="mt-2">{errors.phone?.[0]}</FieldError>
          </div>
        )}

        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
          We&rsquo;ll only contact you about this release. See our{" "}
          <Link
            href={POLICY_ROUTES["privacy-policy"]}
            className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
          >
            Privacy Policy
          </Link>
          .
        </p>

        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          variant="accent"
          size="md"
          loading={join.isPending}
          className="group/cta mt-1 w-full"
        >
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
        </Button>
      </form>
    </>
  );
}

function Checkbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-relaxed text-ink-secondary"
    >
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
            "size-3 text-surface transition-opacity duration-(--duration-fast)",
            checked ? "opacity-100" : "opacity-0",
          )}
        >
          <path d="M2.5 6.25 5 8.75l4.5-5" />
        </svg>
      </span>
      {children}
    </label>
  );
}
