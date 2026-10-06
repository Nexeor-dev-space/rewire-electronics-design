"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteStaffRole, useGetStaffRoles } from "@/hooks/use-role";
import { ADMIN_PAGE_SIZE, STAFF_ACCOUNTS_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { StaffRoleListItem } from "@/types/role";
import { RoleFormModal } from "./role-form-modal";

const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_8rem_6rem]";

const FIXED_ROLES = [
  { name: "Admin", description: "Full access to the console. Can't be restricted or deleted." },
  { name: "Customer", description: "No console access." },
];

type Modal = { kind: "create" } | { kind: "edit"; id: string } | null;

/**
 * Governance → Roles: the fixed Admin and Customer roles, then the custom
 * Staff roles. Module access is set in the Add / Edit role modal, not here.
 * Staff accounts get a role under Users → Staff.
 */
export function RolePermissions() {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<StaffRoleListItem | null>(null);

  const roles = useGetStaffRoles({ page, pageSize: ADMIN_PAGE_SIZE });
  const deleteRole = useDeleteStaffRole();

  function confirmDelete() {
    if (!toDelete) return;
    const lastOnPage = roles.data?.items.length === 1 && page > 1;
    deleteRole.mutate(toDelete.id, {
      // A role still assigned is refused; the dialog stays open and says why.
      onSuccess: () => {
        setToDelete(null);
        deleteRole.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteRole.reset();
  }

  let custom: ReactNode;
  if (roles.isPending) {
    custom = Array.from({ length: 3 }, (_, index) => (
      <li key={index} className={cn("grid gap-4 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-16" />
      </li>
    ));
  } else if (roles.isError) {
    custom = (
      <li role="alert" className="px-5 py-8 text-center">
        <p className="text-sm text-ink-secondary">{roles.error.message}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => roles.refetch()}>
          Try again
        </Button>
      </li>
    );
  } else if (roles.data.items.length === 0) {
    custom = (
      <li className="px-5 py-8 text-center text-sm text-ink-secondary">
        No staff roles yet. Add one, then assign it under{" "}
        <Link href={STAFF_ACCOUNTS_PATH} className="text-ink underline-offset-4 hover:underline">
          Users → Staff
        </Link>
        .
      </li>
    );
  } else {
    custom = roles.data.items.map((role) => (
      <li key={role.id} className="border-b border-line last:border-b-0">
        <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS)}>
          <p className="truncate text-sm font-medium text-ink">{role.name}</p>
          <p className="truncate text-sm text-ink-secondary">{role.description ?? "—"}</p>
          <p className="text-sm tabular-nums text-ink-secondary">
            {role.staffCount} {role.staffCount === 1 ? "account" : "accounts"}
          </p>
          <RowActions
            name={role.name}
            disabled={deleteRole.isPending && deleteRole.variables === role.id}
            onEdit={() => setModal({ kind: "edit", id: role.id })}
            onDelete={() => setToDelete(role)}
          />
        </div>
      </li>
    ));
  }

  const pages = roles.data ? Math.max(1, Math.ceil(roles.data.total / ADMIN_PAGE_SIZE)) : 1;

  return (
    <AdminPage
      title="Roles"
      description="What each role can do in the console. Assign Staff roles under Users → Staff."
      actions={
        <Button size="sm" onClick={() => setModal({ kind: "create" })}>
          Add role
        </Button>
      }
    >
      <div className="overflow-hidden rounded-xl border border-line">
        <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
          <p className="eyebrow">Role</p>
          <p className="eyebrow">Description</p>
          <p className="eyebrow">Staff</p>
          <span className="sr-only">Actions</span>
        </div>
        <ul>
          {FIXED_ROLES.map((role) => (
            <li key={role.name} className="border-b border-line">
              <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS)}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">{role.name}</p>
                  <Badge variant="outline" className="px-2 py-1 text-[0.625rem]">
                    Fixed
                  </Badge>
                </div>
                <p className="text-sm text-ink-secondary">{role.description}</p>
                <span />
                <span />
              </div>
            </li>
          ))}
          {custom}
        </ul>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="px-1 font-mono text-xs tabular-nums text-ink-secondary">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </nav>
      )}

      {modal && (
        <RoleFormModal roleId={modal.kind === "edit" ? modal.id : undefined} onClose={() => setModal(null)} />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "role"}?`}
        description="Only a role no staff account holds can be deleted. This can't be undone."
        confirmLabel="Delete role"
        error={deleteRole.isError ? deleteRole.error.message : undefined}
        loading={deleteRole.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}
