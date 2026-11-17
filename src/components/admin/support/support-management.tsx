"use client";

import Link from "next/link";
import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { StatusPill } from "@/components/account/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetTicketAssignees, useGetTicketCategories, useGetTickets } from "@/hooks/use-support";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import {
  TICKET_ASSIGNEE_ME,
  TICKET_ASSIGNEE_NONE,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_SORTS,
  TICKET_SORT_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  ticketPriorityTone,
  ticketHref,
  ticketStatusTone,
  type TicketPriority,
  type TicketSort,
  type TicketStatus,
  UNRESOLVED_TICKET_STATUSES,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";
import type { TicketRow } from "@/types/support";
import { AssignTicketDialog } from "./assign-ticket-dialog";
import { CategoriesDialog } from "./categories-dialog";
import { NewTicketDialog } from "./new-ticket-dialog";

/**
 * Seven columns from `xl` up: ticket, customer, category with order, assignee,
 * status with priority, dates and actions. Under `xl` each row becomes a two
 * column card whose cells carry their own label (see `Cell`).
 */
const COLUMNS =
  "xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_8rem_6.5rem_5.5rem]";
const ACTION_BUTTON_CLASS = "w-full justify-center";

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  return <StatusPill tone={ticketStatusTone(status)}>{TICKET_STATUS_LABELS[status]}</StatusPill>;
}

export function TicketPriorityPill({ priority }: { priority: TicketPriority }) {
  return <StatusPill tone={ticketPriorityTone(priority)}>{TICKET_PRIORITY_LABELS[priority]}</StatusPill>;
}

export function SupportManagement() {
  const access = useModuleAccess(PERMISSIONS.support);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [sort, setSort] = useState<TicketSort>("updated_desc");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [assigning, setAssigning] = useState<TicketRow | null>(null);

  const categories = useGetTicketCategories();
  const assignees = useGetTicketAssignees();
  const tickets = useGetTickets({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
    categoryId: categoryId || undefined,
    assignee: assignee || undefined,
    sort,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const filtered = Boolean(search || status || priority || categoryId || assignee);

  function filter<T extends string>(set: Dispatch<SetStateAction<T>>) {
    return (event: { target: { value: string } }) => {
      set(event.target.value as T);
      setPage(1);
    };
  }

  let content: ReactNode;
  if (tickets.isPending) {
    content = <TableSkeleton />;
  } else if (tickets.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{tickets.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => tickets.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (tickets.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={filtered ? "No tickets match" : "No tickets yet"}
        description={
          filtered
            ? "Nothing matches these filters."
            : "Customer support requests appear here once they are raised."
        }
      />
    );
  } else {
    const { items, total } = tickets.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((row) => (
              <li key={row.number} className="border-b border-line last:border-b-0">
                <TicketTableRow
                  row={row}
                  canEdit={access.edit}
                  onAssign={() => setAssigning(row)}
                />
              </li>
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
      title="Support Tickets"
      description="Customer conversations and their resolution state."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {access.delete && (
            <>
              <Button variant="outline" size="sm" onClick={() => setManagingCategories(true)}>
                Categories
              </Button>
            </>
          )}
          {access.create && (
            <Button size="sm" onClick={() => setCreating(true)}>
              New ticket
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Ticket ID, customer, email or subject"
          aria-label="Search tickets"
          className="h-10 w-full sm:col-span-2"
        />
        <Select value={status} onChange={filter(setStatus)} aria-label="Filter by status" className="h-10 w-full">
          <option value="">All statuses</option>
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {TICKET_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          value={priority}
          onChange={filter(setPriority)}
          aria-label="Filter by priority"
          className="h-10 w-full"
        >
          <option value="">All priorities</option>
          {TICKET_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {TICKET_PRIORITY_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          value={categoryId}
          onChange={filter(setCategoryId)}
          aria-label="Filter by category"
          className="h-10 w-full"
        >
          <option value="">All categories</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          value={assignee}
          onChange={filter(setAssignee)}
          aria-label="Filter by assigned staff"
          className="h-10 w-full"
        >
          <option value="">All staff</option>
          <option value={TICKET_ASSIGNEE_ME}>Assigned to me</option>
          <option value={TICKET_ASSIGNEE_NONE}>Unassigned</option>
          {assignees.data?.map((person) => (
            <option key={person.id} value={person.id}>
              {person.fullName}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={filter(setSort)}
          aria-label="Sort tickets"
          className="h-10 w-full"
        >
          {TICKET_SORTS.map((value) => (
            <option key={value} value={value}>
              {TICKET_SORT_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {content}

      {creating && <NewTicketDialog onClose={() => setCreating(false)} />}
      {managingCategories && <CategoriesDialog onClose={() => setManagingCategories(false)} />}
      {assigning && <AssignTicketDialog ticket={assigning} onClose={() => setAssigning(null)} />}
    </AdminPage>
  );
}

function isUnresolved(status: TicketStatus) {
  return (UNRESOLVED_TICKET_STATUSES as readonly TicketStatus[]).includes(status);
}

function TicketTableRow({
  row,
  canEdit,
  onAssign,
}: {
  row: TicketRow;
  canEdit: boolean;
  onAssign: () => void;
}) {
  const attention = row.needsReply || row.isNew;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-4 border-l-2 px-5 py-4 transition-colors duration-(--duration-fast) xl:items-center xl:gap-y-0",
        COLUMNS,
        attention
          ? "border-l-accent bg-accent/5 hover:bg-accent/10"
          : "border-l-transparent hover:bg-surface-2",
        !isUnresolved(row.status) && "text-ink-muted",
      )}
    >
      <Cell label="Ticket" className="col-span-2 xl:col-span-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={ticketHref(row.number)} className="font-mono text-sm font-medium text-ink hover:underline">
            {row.number}
          </Link>
          {row.isNew && <StatusPill tone="accent">New</StatusPill>}
          {row.needsReply && !row.isNew && <StatusPill tone="warn">Awaiting reply</StatusPill>}
        </div>
        <p className="mt-1 line-clamp-2 break-words text-sm text-ink-secondary">{row.subject}</p>
      </Cell>

      <Cell label="Customer">
        <p className="break-words text-sm text-ink">{row.customerName}</p>
        <p className="mt-0.5 break-all text-xs text-ink-muted">{row.customerEmail}</p>
      </Cell>

      <Cell label="Category">
        <p className="break-words text-sm text-ink-secondary">{row.categoryName}</p>
        <p className="mt-0.5 font-mono text-xs text-ink-muted">{row.orderNumber ?? "No order"}</p>
      </Cell>

      <Cell label="Assigned to">
        <p className="break-words text-sm text-ink-secondary">{row.assigneeName ?? "Unassigned"}</p>
      </Cell>

      <Cell label="Status">
        <div className="flex flex-wrap gap-1.5 xl:flex-col xl:items-start">
          <TicketStatusPill status={row.status} />
          <TicketPriorityPill priority={row.priority} />
        </div>
      </Cell>

      <Cell label="Created">
        <p className="text-sm tabular-nums text-ink-secondary">{formatOrderDate(row.createdAt)}</p>
        <p className="mt-0.5 text-xs tabular-nums text-ink-muted">Updated {formatOrderDate(row.updatedAt)}</p>
      </Cell>

      <Cell label="Actions" className="col-span-2 xl:col-span-1">
        <div className="flex gap-2 xl:flex-col">
          <Link
            href={ticketHref(row.number)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), ACTION_BUTTON_CLASS)}
          >
            View
          </Link>
          {canEdit && (
            <Button variant="outline" size="sm" className={ACTION_BUTTON_CLASS} onClick={onAssign}>
              Assign
            </Button>
          )}
        </div>
      </Cell>
    </div>
  );
}

/** One value in a row. Under `xl` it shows its own label, since the header row is hidden. */
function Cell({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="eyebrow mb-1.5 xl:hidden">{label}</p>
      {children}
    </div>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-x-4 border-b border-line bg-surface-2 px-5 py-3 xl:grid", COLUMNS)}>
      <p className="eyebrow">Ticket</p>
      <p className="eyebrow">Customer</p>
      <p className="eyebrow">Category and order</p>
      <p className="eyebrow">Assigned to</p>
      <p className="eyebrow">Status and priority</p>
      <p className="eyebrow">Created</p>
      <p className="eyebrow">Actions</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      <TableHeader />
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className={cn("grid grid-cols-2 gap-x-4 gap-y-3 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}
        >
          <div className="col-span-2 space-y-2 xl:col-span-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="col-span-2 space-y-2 xl:col-span-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
