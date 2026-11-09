"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGetMyAddresses, useSaveMyAddresses } from "@/hooks/use-address";
import { useGetMe } from "@/hooks/use-auth";
import { EMIRATES, emirateLabel, type Emirate } from "@/lib/emirates";
import { cn } from "@/lib/utils";
import type { MyAddressesInput, UserAddress } from "@/types/user";
import { AccountShell } from "./account-shell";

/**
 * AccountAddresses — /account/addresses.
 *
 * The signed-in shopper's saved addresses, read from and saved to
 * `/api/v1/account/addresses`. Every change sends the whole list, the same
 * contract the console's Users form uses, so add / edit / delete / set
 * default are one endpoint. Editing opens the form inline where the card
 * was, so the reader never loses their place in the list. The name and
 * phone on each card come from the account itself.
 */

type FormMode =
  | { kind: "create" }
  | { kind: "edit"; id: string }
  | null;

type AddressDraft = Omit<UserAddress, "id" | "isPrimary">;

const EMPTY_DRAFT: AddressDraft = { emirate: "DUBAI", street: "", landmark: "" };

export function AccountAddresses() {
  const me = useGetMe();
  const addresses = useGetMyAddresses();
  const save = useSaveMyAddresses();
  const [form, setForm] = useState<FormMode>(null);

  if (addresses.isPending) return <AccountShell title="Saved addresses" />;

  if (addresses.isError) {
    return (
      <AccountShell title="Saved addresses">
        <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-ink-secondary">{addresses.error.message}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => addresses.refetch()}>
            Try again
          </Button>
        </div>
      </AccountShell>
    );
  }

  const list = addresses.data;

  function commit(next: MyAddressesInput["addresses"], onDone?: () => void) {
    save.mutate({ addresses: next }, { onSuccess: onDone });
  }

  function handleSave(draft: AddressDraft) {
    if (form?.kind === "edit") {
      commit(
        list.map((a) => (a.id === form.id ? { ...a, ...draft } : a)),
        () => setForm(null),
      );
    } else {
      // A new address goes up without an id; the first one saved is the primary.
      commit([...list, { ...draft, isPrimary: list.length === 0 }], () => setForm(null));
    }
  }

  function handleDelete(id: string) {
    commit(list.filter((a) => a.id !== id));
    if (form?.kind === "edit" && form.id === id) setForm(null);
  }

  function handleSetDefault(id: string) {
    commit(list.map((a) => ({ ...a, isPrimary: a.id === id })));
  }

  const editing = form?.kind === "edit" ? list.find((a) => a.id === form.id) : undefined;

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
      {save.isError && (
        <p role="alert" className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[0.875rem] text-danger">
          {save.error.message}
        </p>
      )}

      {form?.kind === "create" && (
        <div className="mb-6">
          <AddressForm
            saving={save.isPending}
            onCancel={() => setForm(null)}
            onSubmit={handleSave}
          />
        </div>
      )}

      {list.length === 0 ? (
        form?.kind !== "create" && (
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-10 text-center">
            <p className="text-[1rem] font-medium text-ink">No addresses saved</p>
            <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-ink-secondary">
              Add your first delivery address to make future orders one click faster.
            </p>
            <button
              type="button"
              onClick={() => setForm({ kind: "create" })}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-ink"
            >
              Add an address
            </button>
          </div>
        )
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((address) =>
            editing?.id === address.id ? (
              <li key={address.id} className="sm:col-span-2">
                <AddressForm
                  initial={address}
                  saving={save.isPending}
                  onCancel={() => setForm(null)}
                  onSubmit={handleSave}
                />
              </li>
            ) : (
              <li key={address.id}>
                <AddressCard
                  address={address}
                  name={me.data?.fullName}
                  phone={me.data?.phone}
                  disabled={save.isPending}
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
  name,
  phone,
  disabled,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: UserAddress;
  name?: string;
  phone?: string | null;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5">
      <header className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          {emirateLabel(address.emirate)}
        </p>
        {address.isPrimary && (
          <span className="rounded-full border border-live/40 bg-live/10 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-live">
            Default
          </span>
        )}
      </header>

      <address className="mt-4 not-italic text-[0.9375rem] leading-relaxed text-ink">
        {name && <p className="font-medium">{name}</p>}
        <p className="break-words text-ink-secondary">{address.street}</p>
        <p className="break-words text-ink-secondary">Near {address.landmark}</p>
        <p className="text-ink-secondary">{emirateLabel(address.emirate)}, UAE</p>
        {phone && <p className="mt-2 text-ink-secondary">{phone}</p>}
      </address>

      <footer className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          type="button"
          disabled={disabled}
          onClick={onEdit}
          className="rounded-full border border-line-strong px-3.5 py-1.5 text-[0.75rem] font-medium text-ink hover:border-ink disabled:opacity-60"
        >
          Edit
        </button>
        {!address.isPrimary && (
          <button
            type="button"
            disabled={disabled}
            onClick={onSetDefault}
            className="rounded-full border border-line-strong px-3.5 py-1.5 text-[0.75rem] font-medium text-ink hover:border-ink disabled:opacity-60"
          >
            Set as default
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="ml-auto rounded-full border border-line px-3.5 py-1.5 text-[0.75rem] font-medium text-ink-muted hover:border-danger/40 hover:text-danger disabled:opacity-60"
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
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: UserAddress;
  saving: boolean;
  onSubmit: (draft: AddressDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<AddressDraft>(
    initial
      ? { emirate: initial.emirate, street: initial.street, landmark: initial.landmark }
      : EMPTY_DRAFT,
  );

  const canSave = Boolean(draft.street.trim() && draft.landmark.trim()) && !saving;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        onSubmit({ ...draft, street: draft.street.trim(), landmark: draft.landmark.trim() });
      }}
      className="rounded-2xl border border-line-strong bg-surface p-6"
    >
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[1.125rem] font-medium text-ink">
          {initial ? "Edit address" : "New address"}
        </h2>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          Delivery &amp; billing
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">
            Emirate
          </span>
          <select
            value={draft.emirate}
            onChange={(e) => setDraft({ ...draft, emirate: e.target.value as Emirate })}
            className="h-11 rounded-xl border border-line-strong bg-surface-2 px-3.5 text-[0.9375rem] text-ink focus:border-accent focus:outline-none"
          >
            {EMIRATES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          className="sm:col-span-2"
          label="Street"
          hint="Building, street name or number"
          value={draft.street}
          onChange={(v) => setDraft({ ...draft, street: v })}
          required
        />
        <Field
          className="sm:col-span-2"
          label="Landmark"
          hint="Nearest landmark"
          value={draft.landmark}
          onChange={(v) => setDraft({ ...draft, landmark: v })}
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
          {saving ? "Saving…" : initial ? "Save changes" : "Add address"}
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
  required,
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">
        {label} {hint && <span className="text-ink-faint">· {hint}</span>}
      </span>
      <input
        type="text"
        value={value}
        required={required}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-line-strong bg-surface-2 px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
    </label>
  );
}
