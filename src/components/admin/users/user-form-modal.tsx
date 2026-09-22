"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateUser, useGetUser, useUpdateUser } from "@/hooks/use-user";
import { apiFieldErrors } from "@/lib/api/api-client";
import { ROLE_LABELS, assignableRoles, canSetPassword, type Role } from "@/lib/auth/permissions";
import type { SessionUser } from "@/types/auth";
import type { UserDetail } from "@/types/user";
import type { UserGroup } from "@/validators/user.validator";
import { userSchema } from "@/validators/user.validator";
import { AddressListEditor, newKey, type DraftAddress } from "./address-list-editor";

interface Props {
  /** Absent to add an account. */
  userId?: string;
  viewer: SessionUser;
  /** Which screen opened this — decides the roles on offer. */
  group: UserGroup;
  onClose: () => void;
}

/** Staff screen offers console roles; the customers screen offers Customer. */
function rolesFor(group: UserGroup, viewer: SessionUser, current?: Role): Role[] {
  const offered =
    group === "staff"
      ? assignableRoles(viewer.role).filter((role) => role !== "CUSTOMER")
      : (["CUSTOMER"] as Role[]);
  return current && !offered.includes(current) ? [current, ...offered] : offered;
}

export function UserFormModal({ userId, viewer, group, onClose }: Props) {
  const isStaff = group === "staff";
  return (
    <Dialog
      open
      onClose={onClose}
      title={
        userId
          ? isStaff
            ? "Edit staff member"
            : "Edit customer"
          : isStaff
            ? "Add staff member"
            : "Add customer"
      }
    >
      {userId ? (
        <EditUser id={userId} viewer={viewer} group={group} onClose={onClose} />
      ) : (
        <UserForm viewer={viewer} group={group} onClose={onClose} />
      )}
    </Dialog>
  );
}

function EditUser({
  id,
  viewer,
  group,
  onClose,
}: {
  id: string;
  viewer: SessionUser;
  group: UserGroup;
  onClose: () => void;
}) {
  const user = useGetUser(id);

  if (user.isPending) {
    return (
      <DialogBody>
        <div aria-busy className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </DialogBody>
    );
  }

  if (user.isError) {
    return (
      <>
        <DialogBody>
          <p role="alert" className="text-sm text-danger">
            {user.error.message}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="button" size="sm" loading={user.isFetching} onClick={() => user.refetch()}>
            Try again
          </Button>
        </DialogFooter>
      </>
    );
  }

  return <UserForm viewer={viewer} group={group} initial={user.data} onClose={onClose} />;
}

function UserForm({
  viewer,
  group,
  initial,
  onClose,
}: {
  viewer: SessionUser;
  group: UserGroup;
  initial?: UserDetail;
  onClose: () => void;
}) {
  const id = useId();
  const roles = rolesFor(group, viewer, initial?.role);
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? roles[0]);
  const [password, setPassword] = useState("");
  const [addresses, setAddresses] = useState<DraftAddress[]>(
    () => initial?.addresses.map((address) => ({ ...address, key: newKey() })) ?? [],
  );
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const mutation = initial ? updateUser : createUser;

  const isSelf = initial?.id === viewer.id;
  // One option means no choice to make — Customers, or Staff for a Staff viewer.
  const roleLocked = isSelf || roles.length === 1;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingAddress !== null) {
      setErrors({ addresses: ["Finish or cancel the address you're editing first."] });
      return;
    }

    const parsed = userSchema.safeParse({
      fullName,
      email,
      phone,
      role,
      password: password || undefined,
      addresses: addresses.map(({ id: addressId, emirate, street, landmark, isPrimary }) => ({
        id: addressId,
        emirate,
        street,
        landmark,
        isPrimary,
      })),
    });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    const options = { onSuccess: onClose, onError: (error: Error) => setErrors(apiFieldErrors(error)) };
    if (initial) updateUser.mutate({ id: initial.id, ...parsed.data }, options);
    else createUser.mutate(parsed.data, options);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-name`} label="Full name" error={error("fullName")}>
            <Input
              id={`${id}-name`}
              data-autofocus
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              aria-invalid={error("fullName") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-email`} label="Email" error={error("email")}>
            <Input
              id={`${id}-email`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error("email") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field id={`${id}-phone`} label="Phone number" error={error("phone")}>
            <Input
              id={`${id}-phone`}
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+971 50 123 4567"
              aria-invalid={error("phone") ? true : undefined}
              className="h-11"
            />
          </Field>

          <Field
            id={`${id}-role`}
            label="Role"
            error={error("role")}
            hint={isSelf ? "You can't change your own role." : undefined}
          >
            <Select
              id={`${id}-role`}
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              disabled={roleLocked}
              className="h-11"
            >
              {roles.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </Select>
          </Field>

          {canSetPassword(viewer.role) && (
            <Field
              id={`${id}-password`}
              label="Password"
              error={error("password")}
              className="sm:col-span-2"
              hint={
                initial?.hasPassword
                  ? "Leave blank to keep the current password."
                  : "Optional. Without one the account can't sign in."
              }
            >
              <Input
                id={`${id}-password`}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={error("password") ? true : undefined}
                className="h-11"
              />
            </Field>
          )}
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <AddressListEditor
            addresses={addresses}
            onChange={setAddresses}
            editing={editingAddress}
            onEditingChange={setEditingAddress}
            error={error("addresses")}
          />
        </div>
      </DialogBody>

      <DialogFooter>
        {mutation.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {mutation.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={mutation.isPending}>
          {initial ? "Save changes" : "Add account"}
        </Button>
      </DialogFooter>
    </form>
  );
}
