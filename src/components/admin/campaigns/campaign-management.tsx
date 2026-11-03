"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteCampaign, useGetCampaignTypes, useGetCampaigns } from "@/hooks/use-campaign";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_CAMPAIGNS_PATH, ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABELS, type CampaignStatus } from "@/lib/pricing/campaign";
import { cn } from "@/lib/utils";
import type { AdminCampaignListItem, CampaignSort } from "@/types/campaign";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { CampaignTypesDialog } from "./campaign-types-dialog";

const COLUMNS = "xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_9.75rem_9.75rem_7rem_9.75rem_5rem]";

const SORT_LABELS: Record<CampaignSort, string> = {
  "created-desc": "Newest created",
  "created-asc": "Oldest created",
  "start-asc": "Start date, soonest",
  "start-desc": "Start date, latest",
};

export const campaignHref = (id: string) => `${ADMIN_CAMPAIGNS_PATH}/${id}`;
export const campaignEditHref = (id: string) => `${campaignHref(id)}/edit`;

export function CampaignManagement() {
  const access = useModuleAccess(PERMISSIONS.campaigns);
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "">("");
  const [typeId, setTypeId] = useState("");
  const [sort, setSort] = useState<CampaignSort>("created-desc");
  const [page, setPage] = useState(1);
  const [managingTypes, setManagingTypes] = useState(false);
  const [toDelete, setToDelete] = useState<AdminCampaignListItem | null>(null);

  const types = useGetCampaignTypes();
  const campaigns = useGetCampaigns({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
    typeId: typeId || undefined,
    sort,
  });
  const deleteCampaign = useDeleteCampaign();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  function confirmDelete() {
    if (!toDelete) return;
    const lastOnPage = campaigns.data?.items.length === 1 && page > 1;

    deleteCampaign.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        deleteCampaign.reset();
        if (lastOnPage) setPage(page - 1);
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteCampaign.reset();
  }

  const filtered = Boolean(search || status || typeId);

  let content: ReactNode;
  if (campaigns.isPending) {
    content = <TableSkeleton />;
  } else if (campaigns.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{campaigns.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => campaigns.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (campaigns.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={filtered ? "No campaigns match" : "No campaigns yet"}
        description={
          filtered ? "Nothing matches these filters." : "Create a campaign to discount products for a set time."
        }
      />
    );
  } else {
    const { items, total } = campaigns.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    const deletingId = deleteCampaign.isPending ? deleteCampaign.variables : undefined;

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((campaign) => (
              <li key={campaign.id} className="border-b border-line last:border-b-0">
                <CampaignRow
                  campaign={campaign}
                  deleting={deletingId === campaign.id}
                  onEdit={access.edit ? () => router.push(campaignEditHref(campaign.id)) : undefined}
                  onDelete={access.delete ? () => setToDelete(campaign) : undefined}
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
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </>
    );
  }

  return (
    <AdminPage
      title="Campaigns"
      description="Scheduled campaigns and the product discounts they apply."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setManagingTypes(true)}>
            Campaign types
          </Button>
          {access.create && (
            <Link href={`${ADMIN_CAMPAIGNS_PATH}/new`} className={buttonVariants({ size: "sm" })}>
              Add campaign
            </Link>
          )}
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by campaign name"
          aria-label="Search campaigns"
          className="h-10 sm:w-80"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as CampaignStatus | "");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-10 sm:w-44"
        >
          <option value="">All statuses</option>
          {CAMPAIGN_STATUSES.map((value) => (
            <option key={value} value={value}>
              {CAMPAIGN_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          value={typeId}
          onChange={(event) => {
            setTypeId(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by campaign type"
          className="h-10 sm:w-48"
        >
          <option value="">All types</option>
          {types.data?.items.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as CampaignSort);
            setPage(1);
          }}
          aria-label="Sort campaigns"
          className="h-10 sm:w-52"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {content}

      {managingTypes && <CampaignTypesDialog onClose={() => setManagingTypes(false)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "campaign"}?`}
        description="Its discounts stop straight away. This can't be undone."
        confirmLabel="Delete campaign"
        error={deleteCampaign.isError ? deleteCampaign.error.message : undefined}
        loading={deleteCampaign.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function CampaignRow({
  campaign,
  deleting,
  onEdit,
  onDelete,
}: {
  campaign: AdminCampaignListItem;
  deleting: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 xl:items-center", COLUMNS, deleting && "opacity-50")}>
      <div className="min-w-0">
        <Link
          href={campaignHref(campaign.id)}
          className="block truncate text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          {campaign.name}
        </Link>
        <p className="mt-0.5 text-xs text-ink-muted">
          {campaign.productCount} {campaign.productCount === 1 ? "product" : "products"}
        </p>
      </div>
      <p className="truncate text-sm text-ink-secondary">{campaign.type.name}</p>
      <DateCell label="Starts" iso={campaign.startsAt} />
      <DateCell label="Ends" iso={campaign.endsAt} />
      <div>
        <CampaignStatusBadge status={campaign.status} />
      </div>
      <DateCell label="Created" iso={campaign.createdAt} />
      <RowActions name={campaign.name} disabled={deleting} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

/** The label stands in for the column header on the stacked layout. */
function DateCell({ label, iso }: { label: string; iso: string }) {
  return (
    <p className="text-sm tabular-nums text-ink-secondary">
      <span className="text-ink-muted xl:hidden">{label}: </span>
      {formatStoreDateTime(iso)}
    </p>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 xl:grid", COLUMNS)}>
      <p className="eyebrow">Campaign</p>
      <p className="eyebrow">Type</p>
      <p className="eyebrow">Starts</p>
      <p className="eyebrow">Ends</p>
      <p className="eyebrow">Status</p>
      <p className="eyebrow">Created</p>
      <span className="sr-only">Actions</span>
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
          className={cn("grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
