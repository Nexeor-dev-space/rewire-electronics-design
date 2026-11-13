"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useGetMe } from "@/hooks/use-auth";
import { useGetSupportCategories, useSubmitSupportTicket } from "@/hooks/use-support";
import { apiFieldErrors } from "@/lib/api/api-client";
import {
  FULL_NAME_MAX_LENGTH,
  ORDER_TRACK_PAGE_PATH,
  SUPPORT_MESSAGE_MAX_LENGTH,
  SUPPORT_PAGE_PATH,
  SUPPORT_SUBJECT_MAX_LENGTH,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { customerTicketSchema } from "@/validators/support.validator";

const MESSAGE_CHOOSE_CATEGORY = "Choose a category.";

/**
 * The customer's way in to a support ticket. Name and email start from the
 * signed in account when there is one, and stay editable either way, so a
 * guest can use the form with just an email address.
 */
export function TicketForm() {
  const id = useId();
  const me = useGetMe();
  const categories = useGetSupportCategories();
  const submit = useSubmitSupportTicket();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  // Only a customer's own details are filled in. Staff browsing the storefront
  // would otherwise see their admin name and email on a customer form.
  const customer = me.data?.role === "CUSTOMER" ? me.data : null;
  const nameValue = name ?? customer?.fullName ?? "";
  const emailValue = email ?? customer?.email ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = {
      customerName: nameValue,
      customerEmail: emailValue,
      categoryId,
      orderNumber,
      subject,
      message,
    };
    const parsed = customerTicketSchema.safeParse(input);
    if (!parsed.success) {
      setErrors({
        ...z.flattenError(parsed.error).fieldErrors,
        ...(categoryId ? {} : { categoryId: [MESSAGE_CHOOSE_CATEGORY] }),
      });
      return;
    }

    setErrors({});
    submit.mutate(input, { onError: (error) => setErrors(apiFieldErrors(error)) });
  }

  if (submit.data) {
    return <TicketSent number={submit.data.number} email={emailValue} />;
  }

  const error = (field: string) => errors[field]?.[0];
  const hasFieldError = Object.values(errors).some((messages) => messages?.length);
  const formError = submit.isError && !hasFieldError ? submit.error.message : null;

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${id}-name`} label="Your name" error={error("customerName")}>
          <Input
            id={`${id}-name`}
            autoComplete="name"
            placeholder="e.g. Sarah Johnson"
            value={nameValue}
            maxLength={FULL_NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error("customerName") ? true : undefined}
          />
        </Field>
        <Field id={`${id}-email`} label="Email address" error={error("customerEmail")}>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            placeholder="e.g. sarah.johnson@example.com"
            value={emailValue}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error("customerEmail") ? true : undefined}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${id}-category`} label="What is it about?" error={error("categoryId")}>
          <Select
            id={`${id}-category`}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={categories.isPending}
            aria-invalid={error("categoryId") ? true : undefined}
          >
            <option value="">Choose a category</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id={`${id}-order`}
          label="Order number (optional)"
          hint="If it is about a purchase, so we can find it quickly."
          error={error("orderNumber")}
        >
          <Input
            id={`${id}-order`}
            placeholder="e.g. RW-12345678"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            aria-invalid={error("orderNumber") ? true : undefined}
          />
        </Field>
      </div>

      <Field id={`${id}-subject`} label="Subject" error={error("subject")}>
        <Input
          id={`${id}-subject`}
          placeholder="e.g. My iPhone will not charge"
          value={subject}
          maxLength={SUPPORT_SUBJECT_MAX_LENGTH}
          onChange={(event) => setSubject(event.target.value)}
          aria-invalid={error("subject") ? true : undefined}
        />
      </Field>

      <Field id={`${id}-message`} label="How can we help?" error={error("message")}>
        <Textarea
          id={`${id}-message`}
          placeholder="e.g. I received my order last week and the battery stopped charging after two days. Could you help?"
          value={message}
          maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={error("message") ? true : undefined}
        />
      </Field>

      {categories.isSuccess && categories.data.length === 0 && (
        <p role="alert" className="text-sm text-danger">
          Tickets are not open right now. Please use the contact details on the support page.
        </p>
      )}

      {(formError || categories.isError) && (
        <p role="alert" className="text-sm text-danger">
          {formError ?? categories.error?.message}
        </p>
      )}

      <Button type="submit" variant="accent" size="md" loading={submit.isPending} className="mt-1 w-full sm:w-auto sm:self-start">
        Send ticket
      </Button>
    </form>
  );
}

function TicketSent({ number, email }: { number: string; email: string }) {
  return (
    <div role="status" className="rounded-2xl border border-line bg-surface-2 p-7 sm:p-8">
      <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-secondary">Ticket received</p>
      <p className="mt-4 font-mono text-2xl tracking-[0.04em] text-ink">{number}</p>
      <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
        Thank you. We will reply to <span className="text-ink">{email}</span>. Keep this number if you need to
        mention the ticket later.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={SUPPORT_PAGE_PATH} className={cn(buttonVariants({ variant: "primary", size: "md" }))}>
          Back to support
        </Link>
        <Link href={ORDER_TRACK_PAGE_PATH} className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
          Track an order
        </Link>
      </div>
    </div>
  );
}
