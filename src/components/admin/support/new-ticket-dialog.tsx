"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useCreateTicket, useGetTicketCategories } from "@/hooks/use-support";
import { apiFieldErrors } from "@/lib/api/api-client";
import { FULL_NAME_MAX_LENGTH, SUPPORT_MESSAGE_MAX_LENGTH, SUPPORT_SUBJECT_MAX_LENGTH } from "@/lib/constants";
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABELS, ticketHref, type TicketPriority } from "@/lib/support-tickets";
import { createTicketSchema } from "@/validators/support.validator";


export function NewTicketDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title="New ticket"
      description="Log a request a customer sent by phone or email. If the email belongs to a customer account, the ticket is linked to it."
      className="max-w-xl"
    >
      <NewTicketForm onClose={onClose} />
    </Dialog>
  );
}

function NewTicketForm({ onClose }: { onClose: () => void }) {
  const id = useId();
  const router = useRouter();
  const categories = useGetTicketCategories();
  const create = useCreateTicket();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [orderNumber, setOrderNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = createTicketSchema.safeParse({
      customerName,
      customerEmail,
      categoryId,
      priority,
      orderNumber,
      subject,
      message,
    });
    if (!parsed.success) {
      setErrors({
        ...z.flattenError(parsed.error).fieldErrors,
        ...(categoryId ? {} : { categoryId: ["Choose a category."] }),
      });
      return;
    }

    setErrors({});
    create.mutate(
      {
        customerName,
        customerEmail,
        categoryId,
        priority,
        orderNumber,
        subject,
        message,
      },
      {
        onSuccess: (ticket) => {
          onClose();
          router.push(ticketHref(ticket.number));
        },
        onError: (error) => setErrors(apiFieldErrors(error)),
      },
    );
  }

  const error = (field: string) => errors[field]?.[0];
  const hasFieldError = Object.values(errors).some((messages) => messages?.length);
  const activeCategories = categories.data?.filter((category) => category.isActive) ?? [];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-name`} label="Customer name" error={error("customerName")}>
              <Input
                id={`${id}-name`}
                data-autofocus
                value={customerName}
                maxLength={FULL_NAME_MAX_LENGTH}
                onChange={(event) => setCustomerName(event.target.value)}
                aria-invalid={error("customerName") ? true : undefined}
                className="h-11"
              />
            </Field>
            <Field id={`${id}-email`} label="Customer email" error={error("customerEmail")}>
              <Input
                id={`${id}-email`}
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                aria-invalid={error("customerEmail") ? true : undefined}
                className="h-11"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${id}-category`} label="Category" error={error("categoryId")}>
              <Select
                id={`${id}-category`}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={categories.isPending}
                aria-invalid={error("categoryId") ? true : undefined}
                className="h-11"
              >
                <option value="">Choose a category</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id={`${id}-priority`} label="Priority" error={error("priority")}>
              <Select
                id={`${id}-priority`}
                value={priority}
                onChange={(event) => setPriority(event.target.value as TicketPriority)}
                className="h-11"
              >
                {TICKET_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {TICKET_PRIORITY_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            id={`${id}-order`}
            label="Related order (optional)"
            hint="The order number, if the request is about a purchase."
            error={error("orderNumber")}
          >
            <Input
              id={`${id}-order`}
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              aria-invalid={error("orderNumber") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-subject`} label="Subject" error={error("subject")}>
            <Input
              id={`${id}-subject`}
              value={subject}
              maxLength={SUPPORT_SUBJECT_MAX_LENGTH}
              onChange={(event) => setSubject(event.target.value)}
              aria-invalid={error("subject") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-message`} label="Customer's message" error={error("message")}>
            <Textarea
              id={`${id}-message`}
              value={message}
              maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={error("message") ? true : undefined}
              className="min-h-28"
            />
          </Field>
        </div>
      </DialogBody>

      <DialogFooter>
        {(create.isError && !hasFieldError) || categories.isError ? (
          <p role="alert" className="mr-auto text-sm text-danger">
            {create.error?.message ?? categories.error?.message}
          </p>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={create.isPending}>
          Create ticket
        </Button>
      </DialogFooter>
    </form>
  );
}
