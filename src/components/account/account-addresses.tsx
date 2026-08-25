"use client";

import { useEffect, useState } from "react";
import type { Address } from "@/types";
import { loadAddresses, saveAddresses, getSeededAddresses } from "@/lib/account-data";
import { cn } from "@/lib/utils";
import { AccountShell } from "./account-shell";

/**
 * AccountAddresses — /account/addresses.
 *
 * A card grid of saved addresses with in-place editing. LocalStorage
 * persists edits so add / edit / delete / set-default are all reviewable
 * end-to-end without a backend. Editing opens the form inline where the
 * card was, so the reader never loses their place in the list.
 */

type FormMode =
  | { kind: "create" }
  | { kind: "edit"; id: string }
  | null;

export function AccountAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<FormMode>(null);

  useEffect(() => {
    setAddresses(loadAddresses());
    setReady(true);
  }, []);

  function commit(next: Address[]) {
    setAddresses(next);
    saveAddresses(next);
  }

  function handleSave(input: Omit<Address, "id"> & { id?: string }) {
    if (input.id) {
      commit(
        addresses.map((a) =>
          a.id === input.id
            ? { ...input, id: input.id, isDefault: a.isDefault } as Address
            : a,
        ),
      );
    } else {
      const id = `addr-${Date.now().toString(36)}`;
      const created: Address = { ...input, id };
      // First address in becomes default automatically.
      if (addresses.length === 0) created.isDefault = true;
      commit([...addresses, created]);
    }
    setForm(null);
  }

  function handleDelete(id: string) {
    const removed = addresses.find((a) => a.id === id);
    const next = addresses.filter((a) => a.id !== id);
    // If we removed the default, promote the first remaining as default.
    if (removed?.isDefault && next[0]) next[0] = { ...next[0], isDefault: true };
    commit(next);
    if (form?.kind === "edit" && form.id === id) setForm(null);
  }

  function handleSetDefault(id: string) {
    commit(
      addresses.map((a) => ({ ...a, isDefault: a.id === id ? true : false })),
    );
  }

  if (!ready) return <AccountShell title="Saved addresses" />;

  return (
    <AccountShell
      title="Saved addresses"
      subtitle="One default, as many alternates as you need. We use the default for delivery and billing unless you tell us otherwise."
      aside={
        form?.kind !== "create" && (
          <button
            type="button"
            onClick={() => setForm({ kind: "create" })}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[0.875rem] font-medium text-white hover:bg-accent-hover"
          >
            + Add address
          </button>
        )
      }
    >
      {form?.kind === "create" && (
        <div className="mb-6">
          <AddressForm
            onCancel={() => setForm(null)}
            onSubmit={(input) => handleSave(input)}
          />
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-10 text-center">
          <p className="text-[1rem] font-medium text-ink">No addresses saved</p>
          <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-ink-secondary">
            Add your first delivery address to make future orders one click faster.
          </p>
          <button
            type="button"
            onClick={() => {
              // Seed a starter so the CRUD flow can be exercised.
              commit([{ ...getSeededAddresses()[0] }]);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-ink"
          >
            Add a starter address
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) =>
            form?.kind === "edit" && form.id === address.id ? (
              <li key={address.id} className="sm:col-span-2">
                <AddressForm
                  initial={address}
                  onCancel={() => setForm(null)}
                  onSubmit={(input) => handleSave(input)}
                />
              </li>
            ) : (
              <li key={address.id}>
                <AddressCard
                  address={address}
                  onEdit={() => setForm({ kind: "edit", id: address.id })}
                  onDelete={() => handleDelete(address.id)}
                  onSetDefault={() => handleSetDefault(address.id)}
                />
              </li>
            ),
          )}
        </ul>
      )}
    </AccountShell>
  );
}

/* ============================================================
   Address card
   ============================================================ */

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
      <header className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          {address.label}
        </p>
        {address.isDefault && (
          <span className="rounded-full border border-live/40 bg-live/10 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-live">
            Default
          </span>
        )}
      </header>

      <address className="mt-4 not-italic text-[0.9375rem] leading-relaxed text-ink">
        <p className="font-medium">{address.name}</p>
        <p className="text-ink-secondary">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ""}
        </p>
        <p className="text-ink-secondary">
          {address.city}, {address.emirate}
          {address.postalCode ? ` · ${address.postalCode}` : ""}
        </p>
        <p className="mt-2 text-ink-secondary">{address.phone}</p>
      </address>

      <footer className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-line-strong px-3.5 py-1.5 text-[0.75rem] font-medium text-ink hover:border-ink"
        >
          Edit
        </button>
        {!address.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            className="rounded-full border border-line-strong px-3.5 py-1.5 text-[0.75rem] font-medium text-ink hover:border-ink"
          >
            Set as default
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto rounded-full border border-line px-3.5 py-1.5 text-[0.75rem] font-medium text-ink-muted hover:border-danger/40 hover:text-danger"
        >
          Delete
        </button>
      </footer>
    </article>
  );
}

/* ============================================================
   Address form (add + edit share it)
   ============================================================ */

function AddressForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Address;
  onSubmit: (input: Omit<Address, "id"> & { id?: string }) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Address>(
    initial ?? {
      id: "",
      label: "Home",
      name: "",
      line1: "",
      line2: "",
      city: "Dubai",
      emirate: "Dubai",
      postalCode: "",
      phone: "",
    },
  );

  const canSave = draft.name.trim() && draft.line1.trim() && draft.city.trim() && draft.phone.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSubmit({ ...draft, id: initial?.id });
      }}
      className="rounded-2xl border border-line-strong bg-surface p-6"
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[1.125rem] font-medium text-ink">
          {initial ? "Edit address" : "New address"}
        </h2>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          {initial ? initial.label : "Delivery & billing"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Label"
          hint="e.g. Home, Office"
          value={draft.label}
          onChange={(v) => setDraft({ ...draft, label: v })}
          required
        />
        <Field
          label="Full name"
          value={draft.name}
          onChange={(v) => setDraft({ ...draft, name: v })}
          required
        />
        <Field
          className="sm:col-span-2"
          label="Address line 1"
          value={draft.line1}
          onChange={(v) => setDraft({ ...draft, line1: v })}
          required
        />
        <Field
          className="sm:col-span-2"
          label="Address line 2"
          hint="Optional"
          value={draft.line2 ?? ""}
          onChange={(v) => setDraft({ ...draft, line2: v })}
        />
        <Field
          label="City"
          value={draft.city}
          onChange={(v) => setDraft({ ...draft, city: v })}
          required
        />
        <Field
          label="Emirate"
          value={draft.emirate}
          onChange={(v) => setDraft({ ...draft, emirate: v })}
          required
        />
        <Field
          label="Postal code"
          hint="Optional"
          value={draft.postalCode ?? ""}
          onChange={(v) => setDraft({ ...draft, postalCode: v })}
        />
        <Field
          label="Phone"
          type="tel"
          value={draft.phone}
          onChange={(v) => setDraft({ ...draft, phone: v })}
          required
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          type="submit"
          disabled={!canSave}
          className={cn(
            "inline-flex h-11 items-center rounded-full px-5 text-[0.875rem] font-medium",
            canSave
              ? "bg-accent text-white hover:bg-accent-hover"
              : "cursor-not-allowed bg-white/[0.04] text-ink-muted",
          )}
        >
          {initial ? "Save changes" : "Add address"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[0.875rem] font-medium text-ink hover:border-ink"
        >
          Cancel
        </button>
      </div>
    </form>
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
