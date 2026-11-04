"use client";

import { useState } from "react";
import { AdminEmptyState } from "@/components/admin/admin-page";
import { LoadError, Pager } from "@/components/admin/orders/order-shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllReleaseWaitlist, useGetReleaseWaitlist } from "@/hooks/use-release";
import { useExportReport } from "@/hooks/use-report";
import { WAITLIST_ADMIN_PAGE_SIZE } from "@/lib/constants";
import type { CsvSection } from "@/lib/csv";
import { formatStoreDateTime, storeToday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { AdminReleaseDetail } from "@/types/release";
import type { AdminWaitlistEntry } from "@/types/storefront-release";

const NOT_CONFIRMED = "Not confirmed";
const CSV_COLUMNS = ["Email", "Email updates", "WhatsApp", "Phone", "Confirmed", "Joined"];

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function confirmedLabel(entry: AdminWaitlistEntry): string {
  return entry.confirmedAt ? formatStoreDateTime(entry.confirmedAt) : NOT_CONFIRMED;
}

async function waitlistSections(releaseId: string): Promise<CsvSection[]> {
  const entries = await fetchAllReleaseWaitlist(releaseId);
  return [
    {
      title: "Waitlist",
      columns: CSV_COLUMNS,
      rows: entries.map((entry) => [
        entry.email,
        yesNo(entry.emailOptIn),
        yesNo(entry.whatsappOptIn),
        entry.phone ?? "",
        confirmedLabel(entry),
        formatStoreDateTime(entry.joinedAt),
      ]),
    },
  ];
}

export function ReleaseWaitlist({ release }: { release: AdminReleaseDetail }) {
  const [page, setPage] = useState(1);
  const waitlist = useGetReleaseWaitlist(release.id, page);

  if (waitlist.isPending) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <Skeleton className="h-9 w-40 self-end" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (waitlist.isError) {
    return <LoadError message={waitlist.error.message} onRetry={() => waitlist.refetch()} />;
  }

  const { items, total } = waitlist.data;

  if (total === 0) {
    return <AdminEmptyState title="No one has joined yet" />;
  }

  const pages = Math.max(1, Math.ceil(total / WAITLIST_ADMIN_PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm tabular-nums text-ink-secondary">
          {total} {total === 1 ? "person" : "people"} on the waitlist
        </p>
        <ExportButton release={release} />
      </div>

      <div
        aria-busy={waitlist.isPlaceholderData}
        className={cn(
          "overflow-x-auto rounded-lg border border-line transition-opacity duration-(--duration-fast)",
          waitlist.isPlaceholderData && "opacity-60",
        )}
      >
        <table className="w-full min-w-4xl text-left text-sm">
          <thead className="border-b border-line bg-surface-2">
            <tr>
              <th className="eyebrow px-4 py-3 font-normal">Email</th>
              <th className="eyebrow px-4 py-3 font-normal">Email updates</th>
              <th className="eyebrow px-4 py-3 font-normal">WhatsApp</th>
              <th className="eyebrow px-4 py-3 font-normal">Phone</th>
              <th className="eyebrow px-4 py-3 font-normal">Confirmed</th>
              <th className="eyebrow px-4 py-3 font-normal">Joined</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id} className="border-b border-line align-top last:border-b-0">
                <td className="px-4 py-3 text-ink">{entry.email}</td>
                <td className="px-4 py-3 text-ink-secondary">{yesNo(entry.emailOptIn)}</td>
                <td className="px-4 py-3 text-ink-secondary">{yesNo(entry.whatsappOptIn)}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-secondary">{entry.phone ?? "—"}</td>
                <td className={cn("px-4 py-3", entry.confirmedAt ? "text-ink-secondary" : "text-ink-muted")}>
                  {confirmedLabel(entry)}
                </td>
                <td className="px-4 py-3 text-ink-secondary">{formatStoreDateTime(entry.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} pages={pages} onPage={setPage} />
    </div>
  );
}

function ExportButton({ release }: { release: AdminReleaseDetail }) {
  const exporter = useExportReport();

  function handleExport() {
    const now = new Date();
    exporter.mutate({
      filename: `rewire-waitlist-${release.slug ?? release.id}-${storeToday(now)}.csv`,
      titleRows: [
        ["Release", release.title],
        ["Generated", formatStoreDateTime(now.toISOString())],
      ],
      sections: () => waitlistSections(release.id),
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outline" size="sm" loading={exporter.isPending} onClick={handleExport}>
        Export CSV
      </Button>
      {exporter.isError && (
        <p role="alert" className="text-xs text-danger">
          {exporter.error.message}
        </p>
      )}
    </div>
  );
}
