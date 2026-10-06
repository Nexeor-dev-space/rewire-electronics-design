"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogBody } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetTrashUser, useGetTrashUsers, useRestoreUser } from "@/hooks/use-trash";
import { PERMISSIONS, ROLE_LABELS, accountModule, canManageUser, hasPermission } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { emirateLabel } from "@/lib/emirates";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/auth";
import type { UserListItem } from "@/types/user";
import { DetailRow, TrashActions, TrashError, TrashPager, TrashSkeleton, formatDate } from "./trash-list";

const COLUMNS = "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_7rem_minmax(0,1.2fr)]";

/**
 * Trash → Users: deleted (INACTIVE) staff and customer accounts. Restore
 * reactivates one; its old sessions stay signed out. Only Admins restore an
 * Admin account. Accounts are not deleted permanently from here.
 */
export function TrashUsers({ viewer }: { viewer: SessionUser }) {
  const access = useModuleAccess(PERMISSIONS.trash);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<string | null>(null);
  const [toRestore, setToRestore] = useState<UserListItem | null>(null);

  const users = useGetTrashUsers({ page, pageSize: ADMIN_PAGE_SIZE, search: search || undefined });
  const restore = useRestoreUser();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function runRestore() {
    if (!toRestore) return;
    const lastOnPage = users.data?.items.length === 1 && page > 1;
    restore.mutate(toRestore.id, {
      onSuccess: () => {
        setToRestore(null);
        restore.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelRestore() {
    setToRestore(null);
    restore.reset();
  }

  let content: ReactNode;
  if (users.isPending) {
    content = <TrashSkeleton columns={COLUMNS} header={<TableHeader />} />;
  } else if (users.isError) {
    content = <TrashError message={users.error.message} onRetry={() => users.refetch()} />;
  } else if (users.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={search ? "No deleted accounts match" : "Trash is empty"}
        description={search ? `Nothing matches “${search}”.` : "Accounts you delete wait here until restored."}
      />
    );
  } else {
    const { items, total } = users.data;
    const busyId = restore.isPending ? restore.variables : undefined;

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((user) => (
              <li key={user.id} className="border-b border-line last:border-b-0">
                <div
                  className={cn(
                    "grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center",
                    COLUMNS,
                    busyId === user.id && "opacity-50",
                  )}
                >
                  <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
                  <p className="truncate text-sm text-ink-secondary">{user.email}</p>
                  <div>
                    <Badge
                      variant={user.role === "CUSTOMER" ? "outline" : "accent"}
                      className="px-2 py-1 text-[0.625rem]"
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </div>
                  <TrashActions
                    name={user.fullName}
                    busy={busyId === user.id}
                    onView={() => setViewing(user.id)}
                    onRestore={
                      access.restore &&
                      canManageUser(viewer, user) &&
                      hasPermission(viewer.permissions, accountModule(user.role), "EDIT")
                        ? () => setToRestore(user)
                        : undefined
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <TrashPager page={page} pages={Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))} onPage={setPage} />
      </>
    );
  }

  return (
    <AdminPage title="Deleted Users" description="Deleted staff and customer accounts, held for restore.">
      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search by name or email"
        aria-label="Search deleted accounts"
        className="mb-5 h-10 sm:w-80"
      />

      {content}

      <UserDetailDialog id={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={toRestore !== null}
        title={`Restore ${toRestore?.fullName ?? "account"}?`}
        description="The account can sign in again. Sessions from before the delete stay signed out."
        confirmLabel="Restore"
        error={restore.isError ? restore.error.message : undefined}
        loading={restore.isPending}
        onCancel={cancelRestore}
        onConfirm={runRestore}
      />
    </AdminPage>
  );
}

function UserDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const user = useGetTrashUser(id);

  let body: ReactNode;
  if (user.isPending) {
    body = <Skeleton className="h-32 w-full" />;
  } else if (user.isError) {
    body = <p className="text-sm text-danger">{user.error.message}</p>;
  } else {
    const data = user.data;
    body = (
      <dl className="flex flex-col gap-3">
        <DetailRow label="Email">{data.email}</DetailRow>
        <DetailRow label="Phone">{data.phone ?? "—"}</DetailRow>
        <DetailRow label="Role">{ROLE_LABELS[data.role]}</DetailRow>
        <DetailRow label="Password">{data.hasPassword ? "Set" : "Not set"}</DetailRow>
        <DetailRow label="Deleted">{formatDate(data.updatedAt)}</DetailRow>
        <DetailRow label="Addresses">
          {data.addresses.length === 0 ? (
            "—"
          ) : (
            <ul className="flex flex-col gap-1">
              {data.addresses.map((address) => (
                <li key={address.id}>
                  {address.street}, {address.landmark}, {emirateLabel(address.emirate)}
                </li>
              ))}
            </ul>
          )}
        </DetailRow>
      </dl>
    );
  }

  return (
    <Dialog open={id !== null} onClose={onClose} title={user.data?.fullName ?? "Deleted account"}>
      <DialogBody>{body}</DialogBody>
    </Dialog>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Name</p>
      <p className="eyebrow">Email</p>
      <p className="eyebrow">Role</p>
      <span className="sr-only">Actions</span>
    </div>
  );
}
