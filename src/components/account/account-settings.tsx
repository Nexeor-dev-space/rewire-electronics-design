"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGetMe, useSignOut } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AccountShell } from "./account-shell";

/**
 * AccountSettings — /account/settings.
 *
 * Three horizontal beats, each in its own card: personal info,
 * password, notification preferences. Personal info is read-only —
 * editing it lands in Stage 3.3 (`account/profile`) — while password
 * and notifications are still client-only stand-ins with success
 * confirmations, so the interaction is reviewable end-to-end until
 * their real endpoints land in Phase 3.
 */

const NOTIFY_KEY = "rewire.account.notifications.v1";

interface NotifyPrefs {
  orderUpdates: boolean;
  drops: boolean;
  offers: boolean;
  productNews: boolean;
}

const DEFAULT_NOTIFY: NotifyPrefs = {
  orderUpdates: true,
  drops: true,
  offers: false,
  productNews: false,
};

export function AccountSettings() {
  const me = useGetMe();
  const signOut = useSignOut();

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [notify, setNotify] = useState<NotifyPrefs>(() => {
    if (typeof window === "undefined") return DEFAULT_NOTIFY;
    try {
      const raw = window.localStorage.getItem(NOTIFY_KEY);
      return raw ? (JSON.parse(raw) as NotifyPrefs) : DEFAULT_NOTIFY;
    } catch {
      return DEFAULT_NOTIFY;
    }
  });
  const [notifySaved, setNotifySaved] = useState(false);

  if (me.isPending) return <AccountShell title="Account settings" />;

  if (me.isError) {
    return (
      <AccountShell title="Account settings">
        <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-ink-secondary">{me.error.message}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => me.refetch()}>
            Try again
          </Button>
        </div>
      </AccountShell>
    );
  }

  const user = me.data;

  return (
    <AccountShell
      title="Account settings"
      subtitle="Personal information, sign-in and how we reach out to you."
    >
      <div className="flex flex-col gap-6">
        {/* ---------- Personal info — read only until account/profile lands ---------- */}
        <section className="rounded-2xl border border-line bg-surface p-6 md:p-7">
          <div className="mb-5">
            <h2 className="text-[1.125rem] font-medium text-ink">Personal information</h2>
            <p className="mt-1 text-[0.875rem] text-ink-secondary">
              Used on invoices and delivery notes. Editing these arrives soon — contact support for
              changes in the meantime.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Full name" value={user?.fullName ?? ""} />
            <ReadOnlyField label="Phone" value={user?.phone ?? "Not added yet"} />
            <ReadOnlyField className="sm:col-span-2" label="Email" value={user?.email ?? ""} />
          </div>
        </section>

        {/* ---------- Password ---------- */}
        <SettingsCard
          title="Change password"
          hint="At least 8 characters, one number, no spaces."
          onSubmit={(e) => {
            e.preventDefault();
            setPasswordMessage(null);
            if (passwords.next.length < 8) {
              setPasswordMessage("New password must be at least 8 characters.");
              return;
            }
            if (passwords.next !== passwords.confirm) {
              setPasswordMessage("The two new passwords don't match.");
              return;
            }
            setPasswordSaved(true);
            setPasswords({ current: "", next: "", confirm: "" });
            window.setTimeout(() => setPasswordSaved(false), 2200);
          }}
          saveLabel="Update password"
          saveDisabled={
            !passwords.current || !passwords.next || !passwords.confirm
          }
          savedMessage={passwordSaved ? "Password updated" : passwordMessage}
          savedTone={passwordMessage && !passwordSaved ? "danger" : "live"}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Current"
              type="password"
              value={passwords.current}
              onChange={(v) => setPasswords({ ...passwords, current: v })}
            />
            <Field
              label="New"
              type="password"
              value={passwords.next}
              onChange={(v) => setPasswords({ ...passwords, next: v })}
            />
            <Field
              label="Confirm new"
              type="password"
              value={passwords.confirm}
              onChange={(v) => setPasswords({ ...passwords, confirm: v })}
            />
          </div>
        </SettingsCard>

        {/* ---------- Notifications ---------- */}
        <SettingsCard
          title="Notification preferences"
          hint="We only send what you ask for. Off means off."
          onSubmit={(e) => {
            e.preventDefault();
            try {
              window.localStorage.setItem(NOTIFY_KEY, JSON.stringify(notify));
            } catch {
              /* storage unavailable */
            }
            setNotifySaved(true);
            window.setTimeout(() => setNotifySaved(false), 2200);
          }}
          saveLabel="Save preferences"
          savedMessage={notifySaved ? "Preferences saved" : null}
        >
          <ul className="flex flex-col divide-y divide-line">
            <NotifyRow
              label="Order & delivery updates"
              hint="Order confirmations, shipping, delivery."
              checked={notify.orderUpdates}
              onChange={(v) => setNotify({ ...notify, orderUpdates: v })}
            />
            <NotifyRow
              label="New drop announcements"
              hint="Monthly, one email per drop."
              checked={notify.drops}
              onChange={(v) => setNotify({ ...notify, drops: v })}
            />
            <NotifyRow
              label="Offers & discounts"
              hint="Occasional — never partner marketing."
              checked={notify.offers}
              onChange={(v) => setNotify({ ...notify, offers: v })}
            />
            <NotifyRow
              label="Product news"
              hint="New categories, expanded warranty terms, guides."
              checked={notify.productNews}
              onChange={(v) => setNotify({ ...notify, productNews: v })}
            />
          </ul>
        </SettingsCard>

        {/* ---------- Danger row — logout ---------- */}
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[1rem] font-medium text-ink">Sign out of this session</h2>
              <p className="mt-1 text-[0.875rem] text-ink-secondary">
                We&rsquo;ll take you back to the homepage. Your cart and saved
                items stay on this device.
              </p>
            </div>
            <button
              type="button"
              disabled={signOut.isPending}
              onClick={() => signOut.mutate(undefined, { onSuccess: () => window.location.assign("/") })}
              className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[0.875rem] font-medium text-ink hover:border-danger hover:text-danger disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </section>
      </div>
    </AccountShell>
  );
}

/* ============================================================
   Small primitives
   ============================================================ */

function SettingsCard({
  title,
  hint,
  children,
  onSubmit,
  saveLabel,
  saveDisabled,
  savedMessage,
  savedTone = "live",
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  saveLabel: string;
  saveDisabled?: boolean;
  savedMessage: string | null;
  savedTone?: "live" | "danger";
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-line bg-surface p-6 md:p-7"
    >
      <div className="mb-5">
        <h2 className="text-[1.125rem] font-medium text-ink">{title}</h2>
        <p className="mt-1 text-[0.875rem] text-ink-secondary">{hint}</p>
      </div>
      {children}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p
          className={cn(
            "min-h-5 font-mono text-[0.6875rem] uppercase tracking-[0.16em]",
            savedTone === "live" ? "text-live" : "text-danger",
          )}
        >
          {savedMessage}
        </p>
        <button
          type="submit"
          disabled={saveDisabled}
          className={cn(
            "inline-flex h-11 items-center rounded-full px-5 text-[0.875rem] font-medium",
            !saveDisabled
              ? "bg-accent text-white hover:bg-accent-hover"
              : "cursor-not-allowed bg-white/[0.04] text-ink-muted",
          )}
        >
          {saveLabel}
        </button>
      </div>
    </form>
  );
}

function NotifyRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <li>
      <label className="flex items-center justify-between gap-6 py-4">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium text-ink">{label}</p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-secondary">{hint}</p>
        </div>
        <span className="relative inline-flex h-6 w-11 shrink-0">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full border transition-colors duration-(--duration-fast)",
              checked
                ? "border-accent bg-accent"
                : "border-line-strong bg-surface-2",
            )}
          />
          <span
            aria-hidden
            className={cn(
              "absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-void transition-[left] duration-(--duration-fast) ease-(--ease-out-quart)",
              checked ? "left-[calc(100%-1.125rem)]" : "left-1",
            )}
          />
        </span>
      </label>
    </li>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = "text",
  required,
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "tel" | "email" | "password";
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">
        {label} {hint && <span className="text-ink-faint">· {hint}</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-line-strong bg-surface-2 px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <p className="flex h-11 items-center rounded-xl border border-line bg-surface-2/60 px-3.5 text-[0.9375rem] text-ink-secondary">
        {value}
      </p>
    </div>
  );
}
