"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { DetailRow, Section } from "@/components/admin/shared/detail-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddTicketMessage,
  useChangeTicketPriority,
  useChangeTicketStatus,
  useGetTicket,
} from "@/hooks/use-support";
import { apiFieldErrors } from "@/lib/api/api-client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_SUPPORT_PATH, SUPPORT_MESSAGE_LIMIT, SUPPORT_MESSAGE_MAX_LENGTH } from "@/lib/constants";
import { formatOrderDate, formatOrderStamp } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import {
  TICKET_EVENT_VERBS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_SENDER_LABELS,
  TICKET_STATUS_LABELS,
  isReopen,
  ticketHref,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";
import type { TicketDetail } from "@/types/support";
import { AssignTicketDialog } from "./assign-ticket-dialog";
import { TicketPriorityPill, TicketStatusPill } from "./support-management";

const ADMIN_ORDERS_PATH = "/admin/orders";
const REOPEN_LABEL = "Reopen ticket";

export function SupportDetail({ number }: { number: string }) {
  const ticket = useGetTicket(number);

  if (ticket.isPending) {
    return (
      <AdminPage title={number}>
        <DetailSkeleton />
      </AdminPage>
    );
  }

  if (ticket.isError) {
    return (
      <AdminPage title={number}>
        <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
          <p className="text-sm text-ink-secondary">{ticket.error.message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => ticket.refetch()}>
              Try again
            </Button>
            <BackLink />
          </div>
        </div>
      </AdminPage>
    );
  }

  return <TicketView detail={ticket.data} />;
}

function TicketView({ detail }: { detail: TicketDetail }) {
  const access = useModuleAccess(PERMISSIONS.support);
  const [assigning, setAssigning] = useState(false);

  return (
    <AdminPage
      title={detail.number}
      description={`${detail.subject}. Raised ${formatOrderDate(detail.createdAt)}.`}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <TicketPriorityPill priority={detail.priority} />
          <TicketStatusPill status={detail.status} />
        </div>
      }
    >
      <div className="mb-6">
        <BackLink />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <ConversationSection detail={detail} canReply={access.edit} />
          <HistorySection detail={detail} />
        </div>

        <div className="flex flex-col gap-6">
          {access.edit && <ManageSection detail={detail} onAssign={() => setAssigning(true)} />}
          <TicketInfoSection detail={detail} />
          <CustomerSection detail={detail} />
        </div>
      </div>

      {assigning && <AssignTicketDialog ticket={detail} onClose={() => setAssigning(false)} />}
    </AdminPage>
  );
}

function BackLink() {
  return (
    <Link
      href={ADMIN_SUPPORT_PATH}
      className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
    >
      All tickets
    </Link>
  );
}

function ConversationSection({ detail, canReply }: { detail: TicketDetail; canReply: boolean }) {
  const hidden = detail.messageCount - detail.messages.length;

  return (
    <Section title="Conversation">
      {hidden > 0 && (
        <p className="mb-4 text-xs text-ink-muted">
          Showing the latest {SUPPORT_MESSAGE_LIMIT} of {detail.messageCount} messages.
        </p>
      )}
      <ol className="space-y-4">
        {detail.messages.map((message) => {
          const staff = message.sender === "STAFF";
          return (
            <li key={message.id} className={cn("flex", staff && "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-xl border px-4 py-3",
                  staff ? "border-accent/30 bg-accent/5" : "border-line bg-surface-2",
                )}
              >
                <p className="text-xs text-ink-muted">
                  <span className="font-medium text-ink-secondary">
                    {staff ? (message.authorName ?? TICKET_SENDER_LABELS.STAFF) : detail.customerName}
                  </span>
                  {` · ${TICKET_SENDER_LABELS[message.sender]} · ${formatOrderStamp(message.at)}`}
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm text-ink">{message.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {canReply &&
        (detail.canReceiveMessages ? (
          <ReplyForm number={detail.number} />
        ) : (
          <p className="mt-5 text-sm text-ink-muted">This ticket is closed, so it cannot take new messages.</p>
        ))}
    </Section>
  );
}

function ReplyForm({ number }: { number: string }) {
  const id = useId();
  const [body, setBody] = useState("");
  const [fromCustomer, setFromCustomer] = useState(false);
  const add = useAddTicketMessage();
  const bodyError = add.isError ? apiFieldErrors(add.error).body?.[0] : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    add.mutate(
      { number, body, from: fromCustomer ? "CUSTOMER" : "STAFF" },
      {
        onSuccess: () => {
          setBody("");
          setFromCustomer(false);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 border-t border-line pt-5">
      <Field
        id={`${id}-body`}
        label={fromCustomer ? "Customer message" : "Reply"}
        hint={
          fromCustomer
            ? "Saved as a message from the customer. No email is sent to them."
            : "The customer is emailed this reply."
        }
        error={bodyError}
      >
        <Textarea
          id={`${id}-body`}
          value={body}
          maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={bodyError ? true : undefined}
          className="min-h-28"
        />
      </Field>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={fromCustomer}
            onChange={(event) => setFromCustomer(event.target.checked)}
          />
          Log as a message from the customer
        </label>
        <Button type="submit" size="sm" loading={add.isPending} disabled={!body.trim()}>
          {fromCustomer ? "Save message" : "Send reply"}
        </Button>
      </div>

      {add.isError && !bodyError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {add.error.message}
        </p>
      )}
    </form>
  );
}

function HistorySection({ detail }: { detail: TicketDetail }) {
  return (
    <Section title="History">
      {detail.events.length === 0 ? (
        <p className="text-sm text-ink-muted">No history yet.</p>
      ) : (
        <ol className="space-y-4">
          {detail.events.map((event, index) => (
            <li key={`${event.type}-${event.at}-${index}`} className="flex items-start gap-4">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-muted" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {event.type === "CREATED"
                      ? `${TICKET_EVENT_VERBS.CREATED} as ${event.to}`
                      : `${TICKET_EVENT_VERBS[event.type]}: ${event.from} to ${event.to}`}
                  </p>
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                    {formatOrderStamp(event.at)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">By {event.actorName ?? "Customer"}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function ManageSection({ detail, onAssign }: { detail: TicketDetail; onAssign: () => void }) {
  const status = useChangeTicketStatus();
  const priority = useChangeTicketPriority();

  function move(to: TicketStatus) {
    status.mutate({ number: detail.number, status: to });
  }

  const error = status.isError ? status.error.message : priority.isError ? priority.error.message : null;

  return (
    <Section title="Manage">
      <div className="grid gap-5">
        <div>
          <p className="mb-2 text-sm text-ink-secondary">Status</p>
          {detail.nextStatuses.length === 0 ? (
            <p className="text-sm text-ink-muted">A closed ticket cannot change status.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {detail.nextStatuses.map((next) => (
                <Button
                  key={next}
                  variant="outline"
                  size="sm"
                  disabled={status.isPending}
                  loading={status.isPending && status.variables?.status === next}
                  onClick={() => move(next)}
                >
                  {isReopen(detail.status, next) ? REOPEN_LABEL : `Mark ${TICKET_STATUS_LABELS[next].toLowerCase()}`}
                </Button>
              ))}
            </div>
          )}
        </div>

        <Field id={`priority-${detail.number}`} label="Priority">
          <Select
            id={`priority-${detail.number}`}
            value={detail.priority}
            disabled={priority.isPending}
            onChange={(event) =>
              priority.mutate({ number: detail.number, priority: event.target.value as TicketPriority })
            }
            className="h-11"
          >
            {TICKET_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {TICKET_PRIORITY_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-ink-secondary">Assigned to</p>
            <p className="truncate text-sm text-ink">{detail.assigneeName ?? "Unassigned"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onAssign}>
            {detail.assigneeId ? "Reassign" : "Assign"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </Section>
  );
}

function TicketInfoSection({ detail }: { detail: TicketDetail }) {
  return (
    <Section title="Ticket">
      <dl className="divide-y divide-line">
        <DetailRow label="Ticket ID">
          <span className="font-mono">{detail.number}</span>
        </DetailRow>
        <DetailRow label="Category">{detail.categoryName}</DetailRow>
        <DetailRow label="Created">{formatOrderStamp(detail.createdAt)}</DetailRow>
        <DetailRow label="Last updated">{formatOrderStamp(detail.updatedAt)}</DetailRow>
        <DetailRow label="Related order">
          {detail.order ? (
            <Link
              href={`${ADMIN_ORDERS_PATH}/${detail.order.number}`}
              className="font-mono underline-offset-4 hover:underline"
            >
              {detail.order.number}
            </Link>
          ) : (
            "None"
          )}
        </DetailRow>
        {detail.order && (
          <DetailRow label="Order total">
            {formatMoney(detail.order.total)}, {ORDER_STATUS_LABELS[detail.order.status].toLowerCase()}
          </DetailRow>
        )}
      </dl>
    </Section>
  );
}

function CustomerSection({ detail }: { detail: TicketDetail }) {
  return (
    <Section title="Customer">
      <p className="text-sm font-medium text-ink">{detail.customerName}</p>
      <p className="mt-0.5 break-all text-sm text-ink-secondary">{detail.customerEmail}</p>
      {detail.customer?.phone && <p className="mt-0.5 text-sm text-ink-secondary">{detail.customer.phone}</p>}
      {!detail.customer && <p className="mt-2 text-xs text-ink-muted">No customer account uses this email.</p>}

      {detail.customerOrders.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow mb-2">Recent orders</p>
          <ul className="divide-y divide-line">
            {detail.customerOrders.map((order) => (
              <li key={order.number} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`${ADMIN_ORDERS_PATH}/${order.number}`}
                  className="font-mono text-sm underline-offset-4 hover:underline"
                >
                  {order.number}
                </Link>
                <span className="text-xs text-ink-secondary">
                  {formatMoney(order.total)}, {ORDER_STATUS_LABELS[order.status].toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.customerTickets.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow mb-2">Other tickets</p>
          <ul className="divide-y divide-line">
            {detail.customerTickets.map((other) => (
              <li key={other.number} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <Link href={ticketHref(other.number)} className="font-mono text-sm underline-offset-4 hover:underline">
                    {other.number}
                  </Link>
                  <TicketStatusPill status={other.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-muted">{other.subject}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-xl border border-line bg-surface p-5 md:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-xl border border-line bg-surface p-5 md:p-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
