"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/components/providers/account-provider";
import { cn } from "@/lib/utils";
import { AccountShell } from "./account-shell";

/**
 * AccountSettings — /account/settings.
 *
 * Three horizontal beats, each in its own card: personal info,
 * password, notification preferences. Password + notifications are
 * client-only stand-ins with success confirmations so the interaction
 * is reviewable end-to-end; real endpoints will replace the handlers.
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
  const router = useRouter();
  const { user, ready, updateUser, signOut } = useAccount();

  const [personal, setPersonal] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [personalSaved, setPersonalSaved] = useState(false);

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

  if (!ready) return <AccountShell title="Account settings" />;

  return (
    <AccountShell
      title="Account settings"
      subtitle="Personal information, sign-in and how we reach out to you."
    >
      <div className="flex flex-col gap-6">
        {/* ---------- Personal info ---------- */}
        <SettingsCard
          title="Personal information"
          hint="Used on invoices and delivery notes."
          onSubmit={(e) => {
            e.preventDefault();
            updateUser(personal);
            setPersonalSaved(true);
            window.setTimeout(() => setPersonalSaved(false), 2200);
          }}
          saveDisabled={
            personal.name === (user?.name ?? "") &&
            personal.email === (user?.email ?? "") &&
            personal.phone === (user?.phone ?? "")
          }
          saveLabel="Save changes"
          savedMessage={personalSaved ? "Saved" : null}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              value={personal.name}
              onChange={(v) => setPersonal({ ...personal, name: v })}
            />
            <Field
              label="Phone"
              type="tel"
              value={personal.phone}
              onChange={(v) => setPersonal({ ...personal, phone: v })}
            />
            <Field
              className="sm:col-span-2"
              label="Email"
              type="email"
              value={personal.email}
              onChange={(v) => setPersonal({ ...personal, email: v })}
            />
          </div>
        </SettingsCard>

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
                We'll take you back to the homepage. Your cart and saved items
                stay on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push("/");
              }}
              className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[0.875rem] font-medium text-ink hover:border-danger hover:text-danger"
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
              ? "bg-[#94b2f3] text-[#0f1419] hover:bg-[#a8c1f6]"
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
                ? "border-[#94b2f3] bg-[#94b2f3]"
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
        className="h-11 rounded-xl border border-line-strong bg-surface-2 px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-muted focus:border-[#94b2f3] focus:outline-none"
      />
    </label>
  );
}
