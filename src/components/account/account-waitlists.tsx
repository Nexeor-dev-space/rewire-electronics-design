"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";
import { useDeleteMyWaitlist, useGetMyWaitlists, useUpdateMyWaitlist } from "@/hooks/use-waitlist";
import { apiFieldErrors } from "@/lib/api/api-client";
import { ACCOUNT_RECENT_ORDERS_LIMIT, RELEASES_PAGE_PATH } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import { releaseHref } from "@/lib/releases";
import { cn } from "@/lib/utils";
import type { MyWaitlistEntry } from "@/types/storefront-release";
import { updateWaitlistSchema } from "@/validators/waitlist.validator";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Countdown } from "@/components/ui/countdown";
import { FieldError } from "@/components/ui/label";
import { PhoneField } from "@/components/ui/phone-field";
import { AccountPagination } from "./account-pagination";
import { NotifyRow } from "./account-settings";
import { AccountShell } from "./account-shell";
import { StatusPill } from "./status-pill";

type FieldErrors = Record<string, string[] | undefined>;

interface Preferences {
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  phone: string;
}

export function AccountWaitlists() {
  const [page, setPage] = useState(1);
  const waitlists = useGetMyWaitlists(page);
  const remove = useDeleteMyWaitlist();
  const [leaving, setLeaving] = useState<MyWaitlistEntry | null>(null);

  function closeLeave() {
    setLeaving(null);
    remove.reset();
  }

  function confirmLeave() {
    if (!leaving) return;
    const lastOnPage = waitlists.data?.items.length === 1 && page > 1;
    remove.mutate(leaving.id, {
      onSuccess: () => {
        setLeaving(null);
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  return (
    <AccountShell
      title="My Waitlists"
      subtitle="Every release you have joined. Choose how we reach you, or leave a list you no longer need."
    >
      {waitlists.isPending ? (
        <div aria-hidden className="flex flex-col gap-3">
          {Array.from({ length: ACCOUNT_RECENT_ORDERS_LIMIT }, (_, index) => (
            <div key={index} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : waitlists.isError ? (
        <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-ink-secondary">{waitlists.error.message}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => waitlists.refetch()}>
            Try again
          </Button>
        </div>
      ) : waitlists.data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul
            aria-busy={waitlists.isPlaceholderData}
            className={cn(
              "flex flex-col gap-3 transition-opacity duration-(--duration-fast)",
              waitlists.isPlaceholderData && "opacity-60",
            )}
          >
            {waitlists.data.items.map((entry) => (
              <li key={entry.id}>
                <WaitlistCard entry={entry} onLeave={() => setLeaving(entry)} />
              </li>
            ))}
          </ul>
          <AccountPagination
            page={page}
            total={waitlists.data.total}
            pageSize={waitlists.data.pageSize}
            onPage={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={leaving !== null}
        title={leaving ? `Leave the ${leaving.releaseTitle} waitlist?` : ""}
        description="You will stop getting updates about this release. You can join again from its page while sign ups are open."
        confirmLabel="Leave waitlist"
        error={remove.isError ? remove.error.message : undefined}
        loading={remove.isPending}
        onCancel={closeLeave}
        onConfirm={confirmLeave}
      />
    </AccountShell>
  );
}

function WaitlistCard({ entry, onLeave }: { entry: MyWaitlistEntry; onLeave: () => void }) {
  const update = useUpdateMyWaitlist();
  const [values, setValues] = useState<Preferences>({
    emailOptIn: entry.emailOptIn,
    whatsappOptIn: entry.whatsappOptIn,
    phone: entry.phone ?? "",
  });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  const upcoming = Date.parse(entry.startsAt) > Date.now();
  const phone = values.whatsappOptIn ? values.phone.trim() : "";
  const dirty =
    values.emailOptIn !== entry.emailOptIn ||
    values.whatsappOptIn !== entry.whatsappOptIn ||
    (values.whatsappOptIn && phone !== (entry.phone ?? ""));
  const fields: FieldErrors = { ...clientErrors, ...apiFieldErrors(update.error) };
  const phoneError = fields.phone?.[0];
  const formError =
    fields.emailOptIn?.[0] ??
    fields.whatsappOptIn?.[0] ??
    (update.isError && !phoneError ? update.error.message : undefined);
  const phoneId = `waitlist-phone-${entry.id}`;

  function change(next: Partial<Preferences>) {
    if (update.isError || update.isSuccess) update.reset();
    setClientErrors({});
    setValues({ ...values, ...next });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateWaitlistSchema.safeParse({
      emailOptIn: values.emailOptIn,
      whatsappOptIn: values.whatsappOptIn,
      phone: phone || null,
    });
    if (!parsed.success) {
      setClientErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setClientErrors({});
    update.mutate({ id: entry.id, ...parsed.data });
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[clamp(1.125rem,1.5vw,1.375rem)] font-medium leading-tight tracking-[-0.02em] text-ink">
            {entry.releaseSlug ? (
              <Link
                href={releaseHref(entry.releaseSlug)}
                className="transition-colors duration-(--duration-fast) hover:text-accent"
              >
                {entry.releaseTitle}
              </Link>
            ) : (
              entry.releaseTitle
            )}
          </h2>
          <p className="mt-2 text-[0.8125rem] text-ink-secondary">
            {upcoming ? "Opens" : "Opened"} {formatStoreDateTime(entry.startsAt)}
          </p>
          {upcoming && (
            <Countdown
              compact
              target={entry.startsAt}
              label={`${entry.releaseTitle} opens in`}
              className="mt-1 block text-[0.75rem] text-accent"
            />
          )}
        </div>
        <StatusPill tone={entry.confirmed ? "live" : "warn"}>
          {entry.confirmed ? "Confirmed" : "Confirm from your email"}
        </StatusPill>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 border-t border-line pt-1">
        <ul className="flex flex-col divide-y divide-line">
          <NotifyRow
            label="Email updates"
            hint="News about this release by email."
            checked={values.emailOptIn}
            onChange={(emailOptIn) => change({ emailOptIn })}
          />
          <NotifyRow
            label="WhatsApp updates"
            hint="Updates about this release on WhatsApp."
            checked={values.whatsappOptIn}
            onChange={(whatsappOptIn) => change({ whatsappOptIn })}
          />
        </ul>

        {values.whatsappOptIn && (
          <PhoneField
            id={phoneId}
            label="WhatsApp number"
            value={values.phone}
            onChange={(next) => change({ phone: next })}
            error={phoneError}
            className="mt-2 max-w-sm"
            controlClassName="h-11 bg-surface-2"
          />
        )}

        <FieldError className="mt-4">{formError}</FieldError>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" loading={update.isPending} disabled={!dirty}>
            Save preferences
          </Button>
          {update.isSuccess && !dirty && (
            <p role="status" className="text-[0.8125rem] text-ink-secondary">
              Preferences saved
            </p>
          )}
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </form>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-10 text-center">
      <p className="text-[1rem] font-medium text-ink">No waitlists yet</p>
      <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-ink-secondary">
        Join the waitlist for an upcoming release and it appears here, with a countdown to its opening.
      </p>
      <Link
        href={RELEASES_PAGE_PATH}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-accent hover:text-accent"
      >
        See upcoming releases
      </Link>
    </div>
  );
}
