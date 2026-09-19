"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteUser, useGetUsers } from "@/hooks/use-user";
import { ROLE_LABELS, canManageUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/auth";
import type { UserListItem } from "@/types/user";
import type { UserGroup } from "@/validators/user.validator";
import { UserFormModal } from "./user-form-modal";

/**
 * The Users list, used by both screens under Service → Users. `group`
 * decides which accounts are fetched and how the page reads: Staff covers
 * the people who can reach the console, Customers the people who buy.
 */

const PAGE_SIZE = 20;
const COLUMNS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_6rem_minmax(0,1fr)_7rem_5rem]";

const COPY = {
  staff: {
    title: "Staff",
    description: "Admin and staff accounts — the people who can reach this console.",
    add: "Add staff member",
    empty: "No staff accounts yet",
    emptyHint: "Add an account for a colleague who needs the console.",
  },
  customers: {
    title: "Customers",
    description: "Customer accounts with their contact details and saved addresses.",
    add: "Add customer",
    empty: "No customers yet",
    emptyHint: "Accounts appear here as shoppers sign up, or add one yourself.",
  },
} satisfies Record<UserGroup, Record<string, string>>;

type Modal = { kind: "create" } | { kind: "edit"; id: string } | null;

export function UserManagement({ viewer, group }: { viewer: SessionUser; group: UserGroup }) {
  const copy = COPY[group];
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [toDelete, setToDelete] = useState<UserListItem | null>(null);

  const users = useGetUsers({ group, page, pageSize: PAGE_SIZE, search: search || undefined });
  const deleteUser = useDeleteUser();

  // Search once typing pauses.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function confirmDelete() {
    if (!toDelete) return;
    const lastOnPage = users.data?.items.length === 1 && page > 1;
    deleteUser.mutate(toDelete.id, { onSuccess: () => lastOnPage && setPage(page - 1) });
    setToDelete(null);
  }

  let content: ReactNode;
  if (users.isPending) {
    content = <TableSkeleton />;
  } else if (users.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{users.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => users.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (users.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search ? "No accounts match" : copy.empty}
        description={search ? `Nothing matches “${search}”.` : copy.emptyHint}
      />
    );
  } else {
    const { items, total } = users.data;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                viewer={viewer}
                deleting={deleteUser.isPending && deleteUser.variables === user.id}
                onEdit={() => setModal({ kind: "edit", id: user.id })}
                onDelete={() => setToDelete(user)}
              />
            ))}
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
      </>
    );
  }

  return (
    <AdminPage
      title={copy.title}
      description={copy.description}
      actions={
        <Button size="sm" onClick={() => setModal({ kind: "create" })}>
          {copy.add}
        </Button>
      }
    >
      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search name, email or phone"
        aria-label={`Search ${copy.title.toLowerCase()}`}
        className="mb-5 h-10 sm:w-80"
      />

      {deleteUser.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {deleteUser.error.message}
        </p>
      )}

      {content}

      {modal && (
        <UserFormModal
          userId={modal.kind === "edit" ? modal.id : undefined}
          viewer={viewer}
          group={group}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.fullName ?? "account"}?`}
        description="They'll be removed from this list and won't be able to sign in."
        confirmLabel="Delete account"
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Full name</p>
      <p className="eyebrow">Email</p>
      <p className="eyebrow">Role</p>
      <p className="eyebrow">Phone</p>
      <p className="eyebrow">Last edited</p>
      <span className="sr-only">Actions</span>
    </div>
  );
}

function UserRow({
  user,
  viewer,
  deleting,
  onEdit,
  onDelete,
}: {
  user: UserListItem;
  viewer: SessionUser;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canEdit = canManageUser(viewer, user);
  const canDelete = canEdit && user.id !== viewer.id;

  return (
    <li className={cn("border-b border-line last:border-b-0", deleting && "opacity-50")}>
      <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS)}>
        <p className="truncate text-sm font-medium text-ink">
          {user.fullName}
          {user.id === viewer.id && <span className="ml-2 text-xs text-ink-muted">(you)</span>}
        </p>
        <p className="truncate text-sm text-ink-secondary">{user.email}</p>
        <div>
          <Badge variant={user.role === "CUSTOMER" ? "outline" : "accent"} className="px-2 py-1 text-[0.625rem]">
            {ROLE_LABELS[user.role]}
          </Badge>
        </div>
        <p className="text-sm tabular-nums text-ink-secondary">{user.phone}</p>
        <time dateTime={user.updatedAt} className="text-sm text-ink-secondary">
          {new Date(user.updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </time>
        <div className="mt-2 flex gap-1.5 lg:mt-0 lg:justify-end">
          {canEdit && (
            <IconButton label={`Edit ${user.fullName}`} onClick={onEdit} disabled={deleting}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </IconButton>
          )}
          {canDelete && (
            <IconButton label={`Delete ${user.fullName}`} onClick={onDelete} disabled={deleting}>
              <path d="M4 7h16" />
              <path d="M9 7V4.5h6V7" />
              <path d="M6.5 7l1 12.5h9l1-12.5" />
            </IconButton>
          )}
        </div>
      </div>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-md border border-line p-1.5 text-ink-secondary transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-ink disabled:opacity-40"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      <TableHeader />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={cn("grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
