"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useGetTrackedOrder } from "@/hooks/use-order";
import { ApiError, apiFieldErrors } from "@/lib/api/api-client";
import { ACCOUNT_ORDERS_PATH, FORGOT_PASSWORD_PAGE_PATH, REGISTER_PAGE_PATH } from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import { isReturnable } from "@/lib/returns";
import type { OrderDetail, TrackOrderInput } from "@/types/order";
import { trackOrderSchema } from "@/validators/order.validator";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { OrderDetailBody, OrderDetailSkeleton, OrderStatusPill } from "./order-detail-body";

type Lookup = { number: string; email: string };

const NO_LOOKUP: Lookup = { number: "", email: "" };

function lookupFrom(input: TrackOrderInput): Lookup | null {
  const parsed = trackOrderSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function TrackOrder() {
  const params = useSearchParams();
  const id = useId();
  const [values, setValues] = useState<TrackOrderInput>(() => ({
    number: params.get("number") ?? "",
    email: params.get("email") ?? "",
  }));
  const [lookup, setLookup] = useState<Lookup | null>(() => lookupFrom(values));
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const tracked = useGetTrackedOrder(lookup ?? NO_LOOKUP);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = trackOrderSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    if (lookup && lookup.number === parsed.data.number && lookup.email === parsed.data.email) {
      tracked.refetch();
      return;
    }
    setLookup(parsed.data);
  }

  const serverErrors = apiFieldErrors(tracked.error);
  const numberError = errors.number?.[0] ?? serverErrors.number?.[0];
  const emailError = errors.email?.[0] ?? serverErrors.email?.[0];

  return (
    <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
      <Container>
        <header className="max-w-xl">
          <p className="eyebrow">Track order</p>
          <h1 className="mt-3 text-display-md font-light text-ink">Where is my order?</h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-secondary">
            Enter the order number from your confirmation email and the email you ordered with.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 grid max-w-3xl gap-5 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-2 sm:items-start md:p-7"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-number`}>Order number</Label>
            <Input
              id={`${id}-number`}
              autoComplete="off"
              spellCheck={false}
              value={values.number}
              onChange={(event) => setValues({ ...values, number: event.target.value })}
              aria-invalid={numberError ? true : undefined}
              className="h-11 font-mono uppercase"
            />
            <FieldError>{numberError}</FieldError>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-email`}>Email</Label>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => setValues({ ...values, email: event.target.value })}
              aria-invalid={emailError ? true : undefined}
              className="h-11"
            />
            <FieldError>{emailError}</FieldError>
          </div>
          <Button
            type="submit"
            size="sm"
            loading={Boolean(lookup) && tracked.isFetching}
            className="h-11 sm:col-span-2 sm:justify-self-start"
          >
            Track order
          </Button>
        </form>

        <p className="mt-4 text-[0.875rem] text-ink-secondary">
          Have an account?{" "}
          <Link href={ACCOUNT_ORDERS_PATH} className="font-medium text-ink hover:text-accent">
            See all your orders
          </Link>
        </p>

        <div className="mt-12" aria-live="polite">
          {lookup && <TrackResult tracked={tracked} />}
        </div>
      </Container>
    </div>
  );
}

function TrackResult({ tracked }: { tracked: ReturnType<typeof useGetTrackedOrder> }) {
  if (tracked.isPending) return <OrderDetailSkeleton />;

  if (tracked.isError) {
    const code = tracked.error instanceof ApiError ? tracked.error.body.code : null;
    if (code === "VALIDATION") return null;
    const final = code === "NOT_FOUND" || code === "RATE_LIMITED";
    return (
      <div role="alert" className="max-w-3xl rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-[0.9375rem] text-ink-secondary">{tracked.error.message}</p>
        {!final && (
          <Button variant="outline" size="sm" className="mt-5" onClick={() => tracked.refetch()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return <TrackedOrder order={tracked.data} />;
}

function TrackedOrder({ order }: { order: OrderDetail }) {
  const returnable =
    isReturnable(order, new Date()) && order.lines.some((line) => line.returnableQuantity > 0);

  return (
    <section aria-labelledby="tracked-order-heading">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="tracked-order-heading" className="text-[1.5rem] font-light tracking-[-0.02em] text-ink">
            Order {order.number}
          </h2>
          <p className="mt-2 text-[0.875rem] text-ink-secondary">Placed {formatOrderDate(order.placedAt)}</p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>
      {returnable && (
        <p className="mb-8 rounded-xl border border-line bg-surface-2 px-5 py-4 text-[0.875rem] text-ink-secondary">
          Returns are requested from an account.{" "}
          <Link href={REGISTER_PAGE_PATH} className="font-medium text-ink hover:text-accent">
            Create an account
          </Link>{" "}
          with {order.contact.email} (or{" "}
          <Link href={FORGOT_PASSWORD_PAGE_PATH} className="font-medium text-ink hover:text-accent">
            reset its password
          </Link>{" "}
          if you already have one) and verify the email. This order then appears in your account, where you can
          request a return.
        </p>
      )}
      <OrderDetailBody order={order} />
    </section>
  );
}
