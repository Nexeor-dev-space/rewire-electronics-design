"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateStaffRole, useGetStaffRole, useUpdateStaffRole } from "@/hooks/use-role";
import { apiFieldErrors } from "@/lib/api/api-client";
import {
  ACCESS_LEVEL_LABELS,
  STAFF_MODULES,
  availableLevels,
  type AccessLevel,
} from "@/lib/auth/permissions";
import type { StaffRoleDetail } from "@/types/role";
import { staffRoleSchema } from "@/validators/role.validator";

/**
 * Add or edit a Staff role: its name, description, and an access level per
 * module. Each module offers only the levels that grant something more:
 * View, Edit (add and change) and Full access (also delete, publish, restore).
 */

const noAccess = (): Record<string, AccessLevel> =>
  Object.fromEntries(STAFF_MODULES.map((module) => [module.key, "NONE"]));

export function RoleFormModal({ roleId, onClose }: { roleId?: string; onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title={roleId ? "Edit role" : "Add role"}
      description="Choose what Staff with this role can do in each module."
      className="max-w-2xl"
    >
      {roleId ? <EditRole id={roleId} onClose={onClose} /> : <RoleForm onClose={onClose} />}
    </Dialog>
  );
}

function EditRole({ id, onClose }: { id: string; onClose: () => void }) {
  const role = useGetStaffRole(id);

  if (role.isPending) {
    return (
      <DialogBody>
        <div aria-busy className="grid gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </DialogBody>
    );
  }

  if (role.isError) {
    return (
      <>
        <DialogBody>
          <p role="alert" className="text-sm text-danger">
            {role.error.message}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="button" size="sm" loading={role.isFetching} onClick={() => role.refetch()}>
            Try again
          </Button>
        </DialogFooter>
      </>
    );
  }

  return <RoleForm initial={role.data} onClose={onClose} />;
}

function RoleForm({ initial, onClose }: { initial?: StaffRoleDetail; onClose: () => void }) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [levels, setLevels] = useState<Record<string, AccessLevel>>(() => initial?.permissions ?? noAccess());
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const createRole = useCreateStaffRole();
  const updateRole = useUpdateStaffRole();
  const mutation = initial ? updateRole : createRole;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = staffRoleSchema.safeParse({ name, description, permissions: levels });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (initial) updateRole.mutate({ id: initial.id, ...parsed.data }, callbacks);
    else createRole.mutate(parsed.data, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5">
          <Field id={`${id}-name`} label="Role name" error={error("name")}>
            <Input
              id={`${id}-name`}
              data-autofocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={error("name") ? true : undefined}
              placeholder="e.g. Catalogue Manager"
              className="h-11"
            />
          </Field>

          <Field id={`${id}-description`} label="Description (optional)" error={error("description")}>
            <Textarea
              id={`${id}-description`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-20"
            />
          </Field>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-ink">Module access</legend>
            <p className="mb-3 text-xs text-ink-muted">
              Edit can add and change. Full access can also delete, publish and restore.
            </p>
            {error("permissions") && <p className="mb-2 text-sm text-danger">{error("permissions")}</p>}
            <ul className="overflow-hidden rounded-xl border border-line">
              {STAFF_MODULES.map((module) => (
                <li
                  key={module.key}
                  className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 last:border-b-0"
                >
                  <label htmlFor={`${id}-${module.key}`} className="text-sm text-ink">
                    {module.label}
                  </label>
                  <Select
                    id={`${id}-${module.key}`}
                    value={levels[module.key] ?? "NONE"}
                    onChange={(event) =>
                      setLevels((current) => ({ ...current, [module.key]: event.target.value as AccessLevel }))
                    }
                    className="h-9 w-40 text-sm"
                  >
                    {availableLevels(module).map((level) => (
                      <option key={level} value={level}>
                        {ACCESS_LEVEL_LABELS[level]}
                      </option>
                    ))}
                  </Select>
                </li>
              ))}
            </ul>
          </fieldset>
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
          {initial ? "Save changes" : "Create role"}
        </Button>
      </DialogFooter>
    </form>
  );
}
