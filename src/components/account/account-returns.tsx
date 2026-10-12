"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useCreateReturn, useGetAccountReturns, useGetReturnEligibleOrders } from "@/hooks/use-return";
import { apiFieldErrors } from "@/lib/api/api-client";
import {
  ACCOUNT_RECENT_ORDERS_LIMIT,
  RETURN_DETAIL_MAX_LENGTH,
  RETURN_DETAIL_MIN_LENGTH,
} from "@/lib/constants";
import { formatOrderDate, formatOrderStamp } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  RETURN_REASONS,
  RETURN_REASON_META,
  RETURN_STATUS_LABELS,
  returnStatusTone,
  type ReturnReason,
  type ReturnStateFilter,
} from "@/lib/returns";
import { cn } from "@/lib/utils";
import type { CustomerReturn, EligibleReturnLine, EligibleReturnOrder } from "@/types/return";
import { createReturnSchema } from "@/validators/return.validator";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { AccountPagination } from "./account-pagination";
import { AccountShell } from "./account-shell";
import { StatusPill } from "./status-pill";

type FieldErrors = Record<string, string[] | undefined>;

interface Preset {
  orderNumber: string;
  itemId: string | null;
}

interface Selection {
  orderNumber: string;
  quantities: Record<string, number>;
}

const NO_SELECTION: Selection = { orderNumber: "", quantities: {} };

export function AccountReturns() {
  const params = useSearchParams();
  const presetOrder = params.get("order")?.trim().toUpperCase();
  const preset: Preset | null = presetOrder ? { orderNumber: presetOrder, itemId: params.get("item") } : null;
  const request = (
    <RequestReturnPanel key={`${preset?.orderNumber}-${preset?.itemId}`} preset={preset} />
  );

  return (
    <AccountShell
      title="Returns & refunds"
      subtitle="Track the returns you have in progress and start a new request for a delivered order."
    >
      <div className="flex flex-col gap-10">
        {preset && request}
        <ReturnSection
          state="active"
          title="Active"
          hint="Any return still in the loop with us."
          empty="No active returns right now."
        />
        {!preset && request}
        <ReturnSection state="closed" title="Previous" hint="Refunded or declined." empty="Nothing here yet." />
      </div>
    </AccountShell>
  );
}

function ReturnSection({
  state,
  title,
  hint,
  empty,
}: {
  state: ReturnStateFilter;
  title: string;
  hint: string;
  empty: string;
}) {
  const [page, setPage] = useState(1);
  const returns = useGetAccountReturns({ page, state });

  return (
    <section>
      <SectionHeader title={title} count={returns.data?.total} hint={hint} />
      <div className="mt-4">
        {returns.isPending ? (
          <div aria-hidden className="flex flex-col gap-3">
            {Array.from({ length: ACCOUNT_RECENT_ORDERS_LIMIT }, (_, index) => (
              <div key={index} className="skeleton h-48 rounded-2xl" />
            ))}
          </div>
        ) : returns.isError ? (
          <ErrorPanel message={returns.error.message} onRetry={() => returns.refetch()} />
        ) : returns.data.items.length === 0 ? (
          <EmptyRail message={empty} />
        ) : (
          <>
            <div
              aria-busy={returns.isPlaceholderData}
              className={cn(
                "flex flex-col gap-3 transition-opacity duration-(--duration-fast)",
                returns.isPlaceholderData && "opacity-60",
              )}
            >
              {returns.data.items.map((record) => (
                <ReturnCard key={record.number} record={record} />
              ))}
            </div>
            <AccountPagination
              page={page}
              total={returns.data.total}
              pageSize={returns.data.pageSize}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}

function ReturnCard({ record }: { record: CustomerReturn }) {
  const steps = record.timeline.length;

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-muted">Return</p>
          <p className="text-[0.9375rem] font-medium text-ink">{record.number}</p>
          <p className="text-[0.8125rem] text-ink-muted">
            · from {record.orderNumber} · {formatOrderDate(record.requestedAt)}
          </p>
        </div>
        <StatusPill tone={returnStatusTone(record.status)}>{RETURN_STATUS_LABELS[record.status]}</StatusPill>
      </div>

      <ul className="mt-5 flex flex-col gap-4">
        {record.items.map((line) => (
          <li key={line.orderItemId} className="flex items-center gap-4 sm:gap-6">
            <LineImage url={line.imageUrl} alt={line.imageAlt} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1rem] font-medium text-ink">{line.productName}</p>
              {line.variantLabel && (
                <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">{line.variantLabel}</p>
              )}
              <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                Qty {line.quantity}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-4">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
          Reason · {RETURN_REASON_META[record.reason].label}
        </p>
        {record.refundAmount !== null && (
          <p className="text-[0.875rem] text-ink-secondary">
            Refunded{" "}
            <span className="font-medium tabular-nums text-ink">{formatMoney(record.refundAmount)}</span>
            {record.refundedAt && ` · ${formatOrderDate(record.refundedAt)}`}
          </p>
        )}
      </div>
      {record.detail && <p className="mt-2 text-[0.875rem] text-ink-secondary">{record.detail}</p>}

      {steps > 0 && (
        <details className="mt-5 border-t border-line pt-4">
          <summary className="list-none text-[0.8125rem] font-medium text-ink-secondary hover:text-ink">
            Timeline ({steps} {steps === 1 ? "step" : "steps"})
          </summary>
          <ul className="mt-4 space-y-3 text-[0.875rem]">
            {record.timeline.map((step) => (
              <li key={`${step.status}-${step.at}`} className="flex items-start gap-4">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    step.status === "DECLINED" ? "bg-danger" : "bg-live",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-ink">{step.label}</p>
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                      {formatOrderStamp(step.at)}
                    </p>
                  </div>
                  {step.note && <p className="mt-0.5 text-ink-secondary">{step.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function returnableLines(order: EligibleReturnOrder) {
  return order.lines.filter((line) => line.returnableQuantity > 0);
}

function presetSelection(orders: EligibleReturnOrder[], preset: Preset | null): Selection | null {
  if (!preset) return null;
  const order = orders.find((candidate) => candidate.orderNumber === preset.orderNumber);
  if (!order) return null;
  const lines = returnableLines(order).filter((line) => !preset.itemId || line.orderItemId === preset.itemId);
  if (lines.length === 0) return null;
  return {
    orderNumber: order.orderNumber,
    quantities: Object.fromEntries(lines.map((line) => [line.orderItemId, 1])),
  };
}

function RequestReturnPanel({ preset }: { preset: Preset | null }) {
  const [page, setPage] = useState(1);
  const eligible = useGetReturnEligibleOrders(page);
  const create = useCreateReturn();
  const [picked, setPicked] = useState<Selection | null>(null);
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [detail, setDetail] = useState("");
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  const orders = (eligible.data?.items ?? []).filter((order) => returnableLines(order).length > 0);
  const selection = picked ?? presetSelection(orders, preset) ?? NO_SELECTION;
  const chosenOrder = orders.find((order) => order.orderNumber === selection.orderNumber) ?? null;
  const chosenLines = chosenOrder
    ? chosenOrder.lines.filter((line) => selection.quantities[line.orderItemId])
    : [];
  const fields: FieldErrors = { ...clientErrors, ...apiFieldErrors(create.error) };
  const submittedItems = create.variables?.items ?? [];

  function edit(change: () => void) {
    if (create.isError) create.reset();
    setClientErrors({});
    change();
  }

  function toggleLine(order: EligibleReturnOrder, line: EligibleReturnLine) {
    edit(() => {
      const quantities = selection.orderNumber === order.orderNumber ? { ...selection.quantities } : {};
      if (quantities[line.orderItemId]) delete quantities[line.orderItemId];
      else quantities[line.orderItemId] = 1;
      setPicked({ orderNumber: order.orderNumber, quantities });
    });
  }

  function setQuantity(line: EligibleReturnLine, quantity: number) {
    edit(() =>
      setPicked({
        orderNumber: selection.orderNumber,
        quantities: { ...selection.quantities, [line.orderItemId]: quantity },
      }),
    );
  }

  function lineError(line: EligibleReturnLine) {
    const index = submittedItems.findIndex((item) => item.orderItemId === line.orderItemId);
    if (index < 0) return undefined;
    return (fields[`items.${index}.quantity`] ?? fields[`items.${index}.orderItemId`])?.[0];
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createReturnSchema.safeParse({
      orderNumber: selection.orderNumber,
      items: chosenLines.map((line) => ({
        orderItemId: line.orderItemId,
        quantity: selection.quantities[line.orderItemId],
      })),
      reason: reason ?? undefined,
      detail,
    });
    if (!parsed.success) {
      setClientErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setClientErrors({});
    create.mutate(parsed.data);
  }

  function startAnother() {
    create.reset();
    setPicked(NO_SELECTION);
    setReason(null);
    setDetail("");
  }

  if (create.isSuccess) {
    return (
      <PanelFrame>
        <div role="status" className="mt-5 rounded-xl border border-live/30 bg-live/5 p-5">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-live">Request submitted</p>
          <p className="mt-2 text-[1rem] font-medium text-ink">
            Return {create.data.number} is in. We will review it and update its status here.
          </p>
          <p className="mt-2 max-w-xl text-[0.875rem] text-ink-secondary">
            It is logged against order {create.data.orderNumber} and now shows in your active returns.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={startAnother}>
            Start another
          </Button>
        </div>
      </PanelFrame>
    );
  }

  if (eligible.isPending) {
    return (
      <PanelFrame>
        <div aria-hidden className="mt-5 flex flex-col gap-2.5">
          {Array.from({ length: ACCOUNT_RECENT_ORDERS_LIMIT }, (_, index) => (
            <div key={index} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </PanelFrame>
    );
  }

  if (eligible.isError) {
    return (
      <PanelFrame>
        <div className="mt-5">
          <ErrorPanel message={eligible.error.message} onRetry={() => eligible.refetch()} />
        </div>
      </PanelFrame>
    );
  }

  const { total, pageSize } = eligible.data;
  const pagination = <AccountPagination page={page} total={total} pageSize={pageSize} onPage={setPage} />;

  if (orders.length === 0) {
    return (
      <PanelFrame>
        <p className="mt-4 rounded-xl border border-line bg-surface-2 p-4 text-[0.875rem] text-ink-secondary">
          {total > pageSize
            ? "Nothing left to return on this page."
            : "No eligible items right now. Once a delivered order is inside its return window it will appear here."}
        </p>
        {pagination}
      </PanelFrame>
    );
  }

  const reasonMeta = reason ? RETURN_REASON_META[reason] : null;
  const detailError = fields.detail?.[0];
  const formError = fields.items?.[0] ?? fields.reason?.[0] ?? fields.orderNumber?.[0];

  return (
    <PanelFrame>
      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-6">
        <StepBlock index={1} title="Select the items" hint="One order per request.">
          <div
            aria-busy={eligible.isPlaceholderData}
            className={cn(
              "flex flex-col gap-5 transition-opacity duration-(--duration-fast)",
              eligible.isPlaceholderData && "opacity-60",
            )}
          >
            {orders.map((order) => (
              <div key={order.orderNumber}>
                <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                  Order {order.orderNumber} · Return by {formatOrderDate(order.returnableUntil)}
                </p>
                <ul className="grid gap-2.5">
                  {returnableLines(order).map((line) => (
                    <EligibleLineRow
                      key={line.orderItemId}
                      line={line}
                      quantity={
                        selection.orderNumber === order.orderNumber
                          ? (selection.quantities[line.orderItemId] ?? 0)
                          : 0
                      }
                      error={lineError(line)}
                      onToggle={() => toggleLine(order, line)}
                      onQuantity={(quantity) => setQuantity(line, quantity)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {pagination}
        </StepBlock>

        {chosenLines.length > 0 && (
          <StepBlock index={2} title="Pick a reason">
            <fieldset className="grid gap-2.5">
              <legend className="sr-only">Reason for the return</legend>
              {RETURN_REASONS.map((value) => {
                const meta = RETURN_REASON_META[value];
                const active = reason === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "cursor-pointer rounded-xl border p-4 transition-colors duration-(--duration-fast) has-[:focus-visible]:border-accent",
                      active ? "border-line-strong bg-surface-2" : "border-line bg-surface-2/60 hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="return-reason"
                      className="sr-only"
                      checked={active}
                      onChange={() => edit(() => setReason(value))}
                    />
                    <p className="text-[0.9375rem] font-medium text-ink">{meta.label}</p>
                    <p className="mt-1 text-[0.8125rem] text-ink-secondary">{meta.note}</p>
                  </label>
                );
              })}
            </fieldset>
            <FieldError className="mt-2">{fields.reason?.[0]}</FieldError>

            <label className="mt-4 block">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
                Additional information {reasonMeta?.requiresDetail ? "(required)" : "(optional)"}
              </span>
              <Textarea
                value={detail}
                onChange={(event) => {
                  const value = event.target.value;
                  edit(() => setDetail(value));
                }}
                rows={3}
                maxLength={RETURN_DETAIL_MAX_LENGTH}
                aria-invalid={detailError ? true : undefined}
                placeholder={
                  reasonMeta?.requiresDetail
                    ? "Tell us what happened, in as much detail as you can."
                    : "Anything else we should know?"
                }
                className="mt-2 min-h-24 bg-surface-2"
              />
            </label>
            <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
              <FieldError>{detailError}</FieldError>
              <p className="ml-auto font-mono text-[0.625rem] tabular-nums text-ink-muted">
                {reasonMeta?.requiresDetail && `At least ${RETURN_DETAIL_MIN_LENGTH} characters · `}
                {detail.length} / {RETURN_DETAIL_MAX_LENGTH}
              </p>
            </div>
          </StepBlock>
        )}

        {chosenLines.length > 0 && (
          <StepBlock index={3} title="Review & submit">
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <dl className="grid gap-3 text-[0.875rem] sm:grid-cols-2">
                <ReviewRow
                  label="Items"
                  value={chosenLines
                    .map((line) => `${line.productName} × ${selection.quantities[line.orderItemId]}`)
                    .join(", ")}
                />
                <ReviewRow label="From order" value={selection.orderNumber} />
                <ReviewRow label="Reason" value={reasonMeta?.label ?? "Not chosen yet"} />
              </dl>
            </div>
            <FieldError className="mt-3">{formError ?? (create.isError ? create.error.message : undefined)}</FieldError>
            <Button type="submit" loading={create.isPending} className="mt-4">
              Submit return request
            </Button>
          </StepBlock>
        )}
      </form>
    </PanelFrame>
  );
}

function EligibleLineRow({
  line,
  quantity,
  error,
  onToggle,
  onQuantity,
}: {
  line: EligibleReturnLine;
  quantity: number;
  error?: string;
  onToggle: () => void;
  onQuantity: (quantity: number) => void;
}) {
  const selected = quantity > 0;

  return (
    <li
      className={cn(
        "rounded-xl border p-3 transition-colors duration-(--duration-fast) has-[:focus-visible]:border-accent",
        selected ? "border-line-strong bg-surface-2" : "border-line bg-surface-2/60 hover:border-line-strong",
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
          <input type="checkbox" className="sr-only" checked={selected} onChange={onToggle} />
          <LineImage url={line.imageUrl} alt="" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-medium text-ink">{line.productName}</p>
            <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
              {[line.variantLabel, `${line.returnableQuantity} of ${line.quantity} returnable`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <span
            aria-hidden
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border",
              selected ? "border-accent bg-accent" : "border-line-strong bg-surface",
            )}
          >
            {selected && (
              <svg
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3 text-white"
              >
                <path d="M2.5 6.5l2.5 2.5 4.5-5" />
              </svg>
            )}
          </span>
        </label>
        {selected && line.returnableQuantity > 1 && (
          <QuantityStepper
            value={quantity}
            max={line.returnableQuantity}
            canDecrement={quantity > 1}
            onIncrement={() => onQuantity(quantity + 1)}
            onDecrement={() => onQuantity(quantity - 1)}
            itemLabel={line.productName}
            className="ml-auto"
          />
        )}
      </div>
      <FieldError className="mt-2">{error}</FieldError>
    </li>
  );
}

function LineImage({ url, alt, size }: { url: string | null; alt: string; size: "sm" | "lg" }) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-plate",
        size === "lg" ? "size-20 rounded-xl" : "size-14 rounded-lg",
      )}
    >
      {url && (
        <Image
          src={url}
          alt={alt}
          fill
          sizes={size === "lg" ? "80px" : "56px"}
          className={cn("object-contain", size === "lg" ? "p-2" : "p-1.5")}
        />
      )}
    </div>
  );
}

function PanelFrame({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 md:p-7">
      <h2 className="text-[1.125rem] font-medium text-ink">Request a new return</h2>
      {children}
    </section>
  );
}

function StepBlock({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="flex size-6 items-center justify-center rounded-full border border-line-strong font-mono text-[0.6875rem] tabular-nums text-ink">
          {index}
        </span>
        <p className="text-[0.9375rem] font-medium text-ink">{title}</p>
        {hint && <p className="text-[0.8125rem] text-ink-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">{label}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}

function SectionHeader({ title, count, hint }: { title: string; count?: number; hint: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[1.125rem] font-medium text-ink">{title}</h2>
        {count !== undefined && (
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">{count}</span>
        )}
      </div>
      <p className="text-[0.8125rem] text-ink-muted">{hint}</p>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
      <p className="text-sm text-ink-secondary">{message}</p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function EmptyRail({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-6 text-center">
      <p className="text-[0.9375rem] text-ink-secondary">{message}</p>
    </div>
  );
}
