"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetStaffPermissions, useSaveStaffPermissions } from "@/hooks/use-role";
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  STAFF_MODULES,
  normaliseActions,
  type AdminModule,
  type PermissionAction,
  type PermissionGrid,
} from "@/lib/auth/permissions";
import { STAFF_ACCOUNTS_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";

const COLUMNS = "grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))]";

const FIXED_ROLES = [
  { label: "Admin", access: "Every module and action, always. Not editable, so nobody can lock the console." },
  { label: "Customer", access: "No console access." },
];

/**
 * The Roles screen: the three roles, and the Staff permission grid, one row
 * per module and one column per action. Admin is fixed to full access and
 * Customer to none; only Staff is configured. Which account holds which role
 * is set under Users → Staff.
 */
export function RolePermissions() {
  const staff = useGetStaffPermissions();

  let content: ReactNode;
  if (staff.isPending) {
    content = <GridSkeleton />;
  } else if (staff.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{staff.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => staff.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    content = <StaffGrid saved={staff.data.permissions} />;
  }

  return (
    <AdminPage
      title="Roles"
      description="What each role can do in the console. Assign roles to accounts under Users → Staff."
    >
      <ul className="mb-8 grid gap-3 sm:grid-cols-2">
        {FIXED_ROLES.map((role) => (
          <li key={role.label} className="rounded-xl border border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-ink">{role.label}</p>
              <Badge variant="outline" className="px-2 py-1 text-[0.625rem]">
                Fixed
              </Badge>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{role.access}</p>
          </li>
        ))}
      </ul>

      <div className="mb-4">
        <h2 className="text-base font-medium text-ink">Staff</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Any action also grants View. Changes apply to every{" "}
          <Link href={STAFF_ACCOUNTS_PATH} className="text-ink underline-offset-4 hover:underline">
            Staff account
          </Link>{" "}
          on its next request.
        </p>
      </div>

      {content}
    </AdminPage>
  );
}

function toggle(module: AdminModule, actions: PermissionAction[], action: PermissionAction): PermissionAction[] {
  if (actions.includes(action)) {
    // Without View nothing else makes sense, so dropping it clears the row.
    return action === "VIEW" ? [] : actions.filter((held) => held !== action);
  }
  return normaliseActions(module, [...actions, action]);
}

function StaffGrid({ saved }: { saved: PermissionGrid }) {
  const [grid, setGrid] = useState<PermissionGrid>(saved);
  const save = useSaveStaffPermissions();
  const dirty = JSON.stringify(grid) !== JSON.stringify(saved);

  function onToggle(module: AdminModule, action: PermissionAction) {
    save.reset();
    setGrid((current) => ({ ...current, [module.key]: toggle(module, current[module.key] ?? [], action) }));
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-line">
        <div className="min-w-[36rem]">
          <div className={cn("grid gap-4 border-b border-line bg-surface-2 px-5 py-3", COLUMNS)}>
            <p className="eyebrow">Module</p>
            {PERMISSION_ACTIONS.map((action) => (
              <p key={action} className="eyebrow text-center">
                {PERMISSION_ACTION_LABELS[action]}
              </p>
            ))}
          </div>

          <ul>
            {STAFF_MODULES.map((module) => (
              <li
                key={module.key}
                className={cn("grid items-center gap-4 border-b border-line px-5 py-3 last:border-b-0", COLUMNS)}
              >
                <p className="text-sm text-ink">{module.label}</p>
                {PERMISSION_ACTIONS.map((action) =>
                  module.actions.includes(action) ? (
                    <input
                      key={action}
                      type="checkbox"
                      checked={grid[module.key]?.includes(action) ?? false}
                      disabled={save.isPending}
                      onChange={() => onToggle(module, action)}
                      aria-label={`${PERMISSION_ACTION_LABELS[action]} ${module.label}`}
                      className="size-4 justify-self-center accent-(--color-accent)"
                    />
                  ) : (
                    <span key={action} className="text-center text-sm text-ink-muted" aria-hidden>
                      —
                    </span>
                  ),
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {save.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {save.error.message}
          </p>
        )}
        {save.isSuccess && !dirty && <p className="mr-auto text-sm text-live">Saved</p>}
        <Button variant="outline" size="sm" disabled={!dirty || save.isPending} onClick={() => setGrid(saved)}>
          Reset
        </Button>
        <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate({ permissions: grid })}>
          Save permissions
        </Button>
      </div>
    </>
  );
}

function GridSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      {Array.from({ length: STAFF_MODULES.length }, (_, index) => (
        <div key={index} className={cn("grid gap-4 border-b border-line px-5 py-3 last:border-b-0", COLUMNS)}>
          <Skeleton className="h-4 w-32" />
          {PERMISSION_ACTIONS.map((action) => (
            <Skeleton key={action} className="size-4 justify-self-center" />
          ))}
        </div>
      ))}
    </div>
  );
}
