"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminEmptyState } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDeliveryAreas } from "@/hooks/use-delivery-zone";
import { ADMIN_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatEta } from "@/lib/delivery";
import { EMIRATES, type Emirate } from "@/lib/emirates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AdminDeliveryArea } from "@/types/delivery";
import { DeliveryAreaFormModal } from "./delivery-area-form-modal";

const COLUMNS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_6rem_5rem]";

type Modal = { kind: "create" } | { kind: "edit"; area: AdminDeliveryArea } | null;

export function DeliveryAreaManagement({
  canEdit,
  onSaved,
}: {
  canEdit: boolean;
  onSaved: (message: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [emirate, setEmirate] = useState<Emirate | "">("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);

  const areas = useGetDeliveryAreas({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    emirate: emirate || undefined,
    search: search || undefined,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const filtered = Boolean(search || emirate);

  let content: ReactNode;
  if (areas.isPending) {
    content = <TableSkeleton />;
  } else if (areas.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{areas.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => areas.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (areas.data.items.length === 0) {
    content = (
      <AdminEmptyState
        title={filtered ? "No areas match" : "No areas yet"}
        description={
          filtered
            ? "Nothing matches these filters."
            : "Without areas, an emirate delivers everywhere at its own rates. Add areas to limit or price delivery by area."
        }
      />
    );
  } else {
    const { items, total } = areas.data;
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    content = (
      <>
        <div className="overflow-hidden rounded-xl border border-line">
          <TableHeader />
          <ul>
            {items.map((area) => (
              <li key={area.id} className="border-b border-line last:border-b-0">
                <AreaRow area={area} onEdit={canEdit ? () => setModal({ kind: "edit", area }) : undefined} />
              </li>
            ))}
          </ul>
        </div>

        {pages > 1 && (
          <nav aria-label="Area pages" className="mt-4 flex items-center justify-end gap-2">
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
    <section aria-labelledby="delivery-areas-heading" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="delivery-areas-heading" className="text-lg font-medium text-ink">
            Areas
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Once an emirate has areas, customers must pick one at checkout. An empty fee or day pair uses the
            emirate&apos;s rate.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setModal({ kind: "create" })}>
            Add area
          </Button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by area"
          aria-label="Search areas"
          className="h-10 sm:w-80"
        />
        <Select
          value={emirate}
          onChange={(event) => {
            setEmirate(event.target.value as Emirate | "");
            setPage(1);
          }}
          aria-label="Filter by emirate"
          className="h-10 sm:w-52"
        >
          <option value="">All emirates</option>
          {EMIRATES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {content}

      {modal && (
        <DeliveryAreaFormModal
          area={modal.kind === "edit" ? modal.area : undefined}
          defaultEmirate={emirate || undefined}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}

function AreaRow({ area, onEdit }: { area: AdminDeliveryArea; onEdit?: () => void }) {
  return (
    <div className={cn("grid gap-x-4 gap-y-1 px-5 py-4 lg:items-center", COLUMNS)}>
      <p className="truncate text-sm font-medium text-ink">{area.area}</p>
      <p className="text-sm text-ink-secondary">{area.emirateLabel}</p>
      <OverrideSummary fee={area.standardFee} minDays={area.standardMinDays} maxDays={area.standardMaxDays} />
      <OverrideSummary fee={area.expressFee} minDays={area.expressMinDays} maxDays={area.expressMaxDays} />
      <div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em]",
            area.enabled ? "bg-live/10 text-live" : "bg-surface-2 text-ink-muted",
          )}
        >
          {area.enabled ? "Delivering" : "Disabled"}
        </span>
      </div>
      <div className="lg:justify-self-end">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

/** What the area sets itself; anything left empty reads "Emirate rate". */
function OverrideSummary({
  fee,
  minDays,
  maxDays,
}: {
  fee: number | null;
  minDays: number | null;
  maxDays: number | null;
}) {
  const feeLabel = fee === null ? "Emirate fee" : fee === 0 ? "Free" : formatMoney(fee);
  const daysLabel = minDays === null || maxDays === null ? "emirate days" : formatEta(minDays, maxDays);
  return (
    <p className={cn("text-sm", fee === null && minDays === null ? "text-ink-muted" : "text-ink-secondary")}>
      {feeLabel} · {daysLabel}
    </p>
  );
}

function TableHeader() {
  return (
    <div className={cn("hidden gap-4 border-b border-line bg-surface-2 px-5 py-3 lg:grid", COLUMNS)}>
      <p className="eyebrow">Area</p>
      <p className="eyebrow">Emirate</p>
      <p className="eyebrow">Standard</p>
      <p className="eyebrow">Express</p>
      <p className="eyebrow">Status</p>
      <span className="sr-only">Actions</span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      <TableHeader />
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className={cn("grid gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0", COLUMNS)}
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-9 w-16" />
        </div>
      ))}
    </div>
  );
}
