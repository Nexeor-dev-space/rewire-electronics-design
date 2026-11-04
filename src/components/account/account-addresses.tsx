"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddressListEditor, type DraftAddress } from "@/components/admin/users/address-list-editor";
import { useGetOwnAddresses, useSaveOwnAddresses } from "@/hooks/use-user";
import { AccountShell } from "./account-shell";

/**
 * AccountAddresses — /account/addresses.
 *
 * The signed-in customer's own saved addresses, read from and saved to
 * `/api/v1/account/addresses`. It reuses the console's `AddressListEditor`,
 * so both sides keep the same rule: exactly one primary address.
 *
 * Every change (add, edit, remove, set primary) saves the full list at
 * once. The edited list shows while the save runs; a failed save puts the
 * stored list back and shows the server's message.
 */
export function AccountAddresses() {
  const addresses = useGetOwnAddresses();
  const save = useSaveOwnAddresses();
  const [pending, setPending] = useState<DraftAddress[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const title = "Saved addresses";
  const subtitle =
    "Your delivery addresses across the Emirates. Keep one as primary.";

  if (addresses.isPending) {
    return (
      <AccountShell title={title} subtitle={subtitle}>
        <div className="grid gap-3">
          {[0, 1].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      </AccountShell>
    );
  }

  if (addresses.isError) {
    return (
      <AccountShell title={title} subtitle={subtitle}>
        <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-ink-secondary">{addresses.error.message}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => addresses.refetch()}>
            Try again
          </Button>
        </div>
      </AccountShell>
    );
  }

  const list: DraftAddress[] =
    pending ?? addresses.data.map((address) => ({ ...address, key: address.id }));

  function handleChange(next: DraftAddress[]) {
    setPending(next);
    save.mutate(
      next.map(({ id, emirate, street, landmark, isPrimary }) => ({ id, emirate, street, landmark, isPrimary })),
      { onSettled: () => setPending(null) },
    );
  }

  return (
    <AccountShell title={title} subtitle={subtitle}>
      <AddressListEditor
        addresses={list}
        onChange={handleChange}
        editing={editing}
        onEditingChange={setEditing}
        error={save.isError ? save.error.message : undefined}
      />
    </AccountShell>
  );
}
