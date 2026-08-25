"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { OrderItem, ReturnRecord } from "@/types";
import { RETURN_STATUS_LABELS, ACTIVE_RETURN_STATUSES } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import {
  formatOrderDate,
  formatOrderStamp,
  getReturnEligibleItems,
  getReturnReasons,
  getReturns,
  returnStatusTone,
} from "@/lib/account-data";
import { AccountShell } from "./account-shell";
import { StatusPill } from "./status-pill";

/**
 * AccountReturns — /account/returns.
 *
 * Two horizontal beats: active returns, previous returns. Below both,
 * a Request-a-return panel opens in place when the user picks an
 * eligible item — three steps, no separate route, no cross-page
 * navigation to lose your work in.
 */

export function AccountReturns() {
  const returns = useMemo(() => getReturns(), []);
  const eligible = useMemo(() => getReturnEligibleItems(), []);

  const active = returns.filter((r) => ACTIVE_RETURN_STATUSES.includes(r.status));
  const past = returns.filter((r) => !ACTIVE_RETURN_STATUSES.includes(r.status));

  // Preselect an item when the URL carries ?order=…&item=…
  const params = useSearchParams();
  const presetItem = useMemo(() => {
    const itemId = params.get("item");
    const orderId = params.get("order");
    if (!itemId && !orderId) return null;
    return (
      eligible.find(
        (e) => e.item.id === itemId || (!itemId && e.orderId === orderId),
      ) ?? null
    );
  }, [params, eligible]);

  return (
    <AccountShell
      title="Returns & refunds"
      subtitle="Track the returns you have in progress and start a new request for a delivered order."
    >
      <div className="flex flex-col gap-10">
        {/* ---------- Active ---------- */}
        <section>
          <SectionHeader
            title="Active"
            count={active.length}
            hint="Any return still in the loop with us."
          />
          {active.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              {active.map((record) => (
                <ReturnCard key={record.id} record={record} />
              ))}
            </div>
          ) : (
            <EmptyRail message="No active returns right now." />
          )}
        </section>

        {/* ---------- Request a new return ---------- */}
        <RequestReturnPanel eligible={eligible} preset={presetItem?.item ?? null} />

        {/* ---------- Previous ---------- */}
        <section>
          <SectionHeader
            title="Previous"
            count={past.length}
            hint="Completed, closed, or refunded."
          />
          {past.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              {past.map((record) => (
                <ReturnCard key={record.id} record={record} />
              ))}
            </div>
          ) : (
            <EmptyRail message="Nothing here yet." />
          )}
        </section>
      </div>
    </AccountShell>
  );
}

/* ============================================================
   Return card
   ============================================================ */

function ReturnCard({ record }: { record: ReturnRecord }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-muted">
            Return
          </p>
          <p className="text-[0.9375rem] font-medium text-ink">{record.number}</p>
          <p className="text-[0.8125rem] text-ink-muted">
            · from {record.orderNumber} · {formatOrderDate(record.requestedAt)}
          </p>
        </div>
        <StatusPill tone={returnStatusTone(record.status)}>
          {RETURN_STATUS_LABELS[record.status]}
        </StatusPill>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-6">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-plate">
          <Image
            src={record.item.image.url}
            alt={record.item.image.alt}
            fill
            sizes="80px"
            className={record.item.image.fit === "cover" ? "object-cover" : "object-contain p-2"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1rem] font-medium text-ink">{record.item.name}</p>
          <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
            {record.item.variant}
          </p>
          <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Reason · {record.reason}
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-auto sm:text-right">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            {record.expectedResolution}
          </p>
          <p className="mt-1 text-[1rem] font-medium tabular-nums text-ink">
            {formatPrice(record.refundAmount, record.currency, record.locale)}
          </p>
        </div>
      </div>

      {/* Timeline — only the reached steps, hidden by default; a small
          disclosure keeps the card compact but the detail one tap away. */}
      <details className="mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer list-none text-[0.8125rem] font-medium text-ink-secondary hover:text-ink">
          Timeline ({record.timeline.filter((s) => s.at).length} steps)
        </summary>
        <ul className="mt-4 space-y-3 text-[0.875rem]">
          {record.timeline.map((step, i) => {
            const reached = Boolean(step.at);
            return (
              <li key={`${step.label}-${i}`} className="flex items-start gap-4">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 size-1.5 shrink-0 rounded-full",
                    reached ? "bg-live" : "bg-ink-faint",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={cn("font-medium", reached ? "text-ink" : "text-ink-muted")}>
                      {step.label}
                    </p>
                    {step.at && (
                      <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                        {formatOrderStamp(step.at)}
                      </p>
                    )}
                  </div>
                  {step.note && <p className="mt-0.5 text-ink-secondary">{step.note}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </details>
    </article>
  );
}

/* ============================================================
   Request-a-return panel
   ============================================================ */

interface Draft {
  itemId: string | null;
  reasonId: string;
  detail: string;
}

function RequestReturnPanel({
  eligible,
  preset,
}: {
  eligible: { orderId: string; orderNumber: string; item: OrderItem }[];
  preset: OrderItem | null;
}) {
  const reasons = useMemo(() => getReturnReasons(), []);
  const [step, setStep] = useState<1 | 2 | 3 | "confirmed">(preset ? 2 : 1);
  const [draft, setDraft] = useState<Draft>({
    itemId: preset?.id ?? null,
    reasonId: reasons[0].id,
    detail: "",
  });

  const chosenItem =
    eligible.find((e) => e.item.id === draft.itemId) ??
    (preset ? eligible.find((e) => e.item.id === preset.id) ?? null : null);

  const chosenReason = reasons.find((r) => r.id === draft.reasonId) ?? reasons[0];
  const needsDetail = chosenReason.requiresDetail;
  const canReview = chosenItem && draft.reasonId && (!needsDetail || draft.detail.trim().length > 3);

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 md:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[1.125rem] font-medium text-ink">Request a new return</h2>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          Step {step === "confirmed" ? "✓" : step} of 3
        </p>
      </div>

      {eligible.length === 0 && step !== "confirmed" ? (
        <p className="mt-4 rounded-xl border border-line bg-surface-2 p-4 text-[0.875rem] text-ink-secondary">
          No eligible items right now. Once a delivered order is inside its
          return window it will appear here.
        </p>
      ) : step === "confirmed" ? (
        <div className="mt-5 rounded-xl border border-live/30 bg-live/5 p-5">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-live">
            Request submitted
          </p>
          <p className="mt-2 text-[1rem] font-medium text-ink">
            You will hear back within one working day.
          </p>
          <p className="mt-2 max-w-xl text-[0.875rem] text-ink-secondary">
            We have logged this against {chosenItem?.orderNumber}. Track it in
            the active returns list above; you can add photos or notes there
            once we confirm pickup.
          </p>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setDraft({ itemId: null, reasonId: reasons[0].id, detail: "" });
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-ink"
          >
            Start another
          </button>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-6">
          {/* ---------- Step 1: choose an item ---------- */}
          {step >= 1 && (
            <StepBlock index={1} title="Select the item">
              <ul className="grid gap-2.5">
                {eligible.map(({ orderNumber, item }) => {
                  const active = draft.itemId === item.id;
                  return (
                    <li key={item.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-4 rounded-xl border p-3 transition-colors duration-(--duration-fast)",
                          active
                            ? "border-line-strong bg-surface-2"
                            : "border-line bg-surface-2/60 hover:border-line-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name="return-item"
                          className="peer sr-only"
                          checked={active}
                          onChange={() => {
                            setDraft((d) => ({ ...d, itemId: item.id }));
                            // `step` is a union with "confirmed", so an
                            // ordering compare doesn't type-check; the
                            // only value below 2 is literally 1.
                            setStep((s) => (s === 1 ? 2 : s));
                          }}
                        />
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-plate">
                          <Image
                            src={item.image.url}
                            alt=""
                            fill
                            sizes="56px"
                            className={item.image.fit === "cover" ? "object-cover" : "object-contain p-1.5"}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.9375rem] font-medium text-ink">
                            {item.name}
                          </p>
                          <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
                            {item.variant} · Order {orderNumber}
                          </p>
                        </div>
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border",
                            active
                              ? "border-accent bg-accent"
                              : "border-line-strong bg-surface",
                          )}
                        >
                          {active && (
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-white">
                              <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                            </svg>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </StepBlock>
          )}

          {/* ---------- Step 2: choose a reason ---------- */}
          {step >= 2 && chosenItem && (
            <StepBlock index={2} title="Pick a reason">
              <div className="grid gap-2.5">
                {reasons.map((reason) => {
                  const active = draft.reasonId === reason.id;
                  return (
                    <label
                      key={reason.id}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-colors duration-(--duration-fast)",
                        active
                          ? "border-line-strong bg-surface-2"
                          : "border-line bg-surface-2/60 hover:border-line-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name="return-reason"
                        className="peer sr-only"
                        checked={active}
                        onChange={() => setDraft((d) => ({ ...d, reasonId: reason.id }))}
                      />
                      <p className="text-[0.9375rem] font-medium text-ink">{reason.label}</p>
                      <p className="mt-1 text-[0.8125rem] text-ink-secondary">{reason.note}</p>
                    </label>
                  );
                })}
              </div>

              <label className="mt-4 block">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
                  Additional information {needsDetail ? "(required)" : "(optional)"}
                </span>
                <textarea
                  value={draft.detail}
                  onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
                  rows={3}
                  placeholder={
                    needsDetail
                      ? "Tell us what happened — as much detail as you can."
                      : "Anything else we should know? Optional."
                  }
                  className="mt-2 w-full resize-y rounded-xl border border-line-strong bg-surface-2 p-3 text-[0.9375rem] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </label>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!canReview}
                  onClick={() => setStep(3)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full px-5 text-[0.875rem] font-medium",
                    canReview
                      ? "bg-accent text-white hover:bg-accent-hover"
                      : "cursor-not-allowed bg-white/[0.04] text-ink-muted",
                  )}
                >
                  Review request →
                </button>
              </div>
            </StepBlock>
          )}

          {/* ---------- Step 3: review ---------- */}
          {step >= 3 && chosenItem && (
            <StepBlock index={3} title="Review & submit">
              <div className="rounded-xl border border-line bg-surface-2/60 p-4">
                <dl className="grid gap-3 text-[0.875rem] sm:grid-cols-2">
                  <ReviewRow label="Item" value={`${chosenItem.item.name} · ${chosenItem.item.variant}`} />
                  <ReviewRow label="From order" value={chosenItem.orderNumber} />
                  <ReviewRow label="Reason" value={chosenReason.label} />
                  {draft.detail && <ReviewRow label="Detail" value={draft.detail} />}
                </dl>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[0.875rem] font-medium text-ink hover:border-ink"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("confirmed")}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.875rem] font-medium text-white hover:bg-accent-hover"
                >
                  Submit return request
                </button>
              </div>
            </StepBlock>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Small primitives ---------- */

function StepBlock({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="flex size-6 items-center justify-center rounded-full border border-line-strong font-mono text-[0.6875rem] tabular-nums text-ink">
          {index}
        </span>
        <p className="text-[0.9375rem] font-medium text-ink">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}

function SectionHeader({ title, count, hint }: { title: string; count: number; hint: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[1.125rem] font-medium text-ink">{title}</h2>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
          {count}
        </span>
      </div>
      <p className="text-[0.8125rem] text-ink-muted">{hint}</p>
    </div>
  );
}

function EmptyRail({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface/60 p-6 text-center">
      <p className="text-[0.9375rem] text-ink-secondary">{message}</p>
    </div>
  );
}

