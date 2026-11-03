"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminPage } from "@/components/admin/admin-page";
import { DetailRow, Section } from "@/components/admin/shared/detail-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteCampaign, useGetCampaign, useSetCampaignStatus } from "@/hooks/use-campaign";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ADMIN_CAMPAIGNS_PATH } from "@/lib/constants";
import { formatStoreDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { campaignActions, campaignPrice, type CampaignAction } from "@/lib/pricing/campaign";
import type { AdminCampaign, AdminCampaignProduct } from "@/types/campaign";
import { campaignEditHref } from "./campaign-management";
import { CampaignStatusBadge } from "./campaign-status-badge";

const ACTION_LABELS: Record<CampaignAction, string> = {
  PUBLISH: "Publish",
  PAUSE: "Pause",
  RESUME: "Resume",
  CANCEL: "Cancel campaign",
};

function discountLabel(product: AdminCampaignProduct): string {
  return product.discountType === "PERCENT"
    ? `${product.discountValue}% off`
    : `${formatMoney(product.discountValue)} off`;
}

function CampaignBackLink() {
  return (
    <Link
      href={ADMIN_CAMPAIGNS_PATH}
      className="text-sm text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
    >
      All campaigns
    </Link>
  );
}

export function CampaignDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
      <p className="text-sm text-ink-secondary">{message}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
        <CampaignBackLink />
      </div>
    </div>
  );
}

export function CampaignDetailSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 rounded-xl border border-line p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function CampaignDetail({ id }: { id: string }) {
  const detail = useGetCampaign(id);

  if (detail.isPending) {
    return (
      <AdminPage title="Campaign">
        <CampaignDetailSkeleton />
      </AdminPage>
    );
  }

  if (detail.isError) {
    return (
      <AdminPage title="Campaign">
        <CampaignDetailError message={detail.error.message} onRetry={() => detail.refetch()} />
      </AdminPage>
    );
  }

  return <CampaignDetailView campaign={detail.data} />;
}

function CampaignDetailView({ campaign }: { campaign: AdminCampaign }) {
  const access = useModuleAccess(PERMISSIONS.campaigns);
  const router = useRouter();
  const setStatus = useSetCampaignStatus();
  const deleteCampaign = useDeleteCampaign();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const actions = access.publish ? campaignActions(campaign.status) : [];

  function runAction(action: CampaignAction) {
    if (action === "CANCEL") {
      setConfirmingCancel(true);
      return;
    }
    setStatus.mutate({ id: campaign.id, action });
  }

  return (
    <AdminPage
      title={campaign.name}
      description={campaign.type.name}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <CampaignStatusBadge status={campaign.status} />
          {access.edit && (
            <Link href={campaignEditHref(campaign.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Edit
            </Link>
          )}
          {actions.map((action) => (
            <Button
              key={action}
              size="sm"
              variant={action === "CANCEL" ? "outline" : undefined}
              loading={setStatus.isPending && setStatus.variables?.action === action}
              disabled={setStatus.isPending}
              onClick={() => runAction(action)}
            >
              {ACTION_LABELS[action]}
            </Button>
          ))}
          {access.delete && (
            <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-6">
        <CampaignBackLink />
      </div>

      {setStatus.isError && !confirmingCancel && (
        <p role="alert" className="mb-6 rounded-lg border border-danger px-4 py-3 text-sm text-danger">
          {setStatus.error.message}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Section title={`Products (${campaign.products.length})`}>
          {campaign.products.length === 0 ? (
            <p className="text-sm text-ink-muted">No products yet. Add at least one before publishing.</p>
          ) : (
            <ul className="divide-y divide-line">
              {campaign.products.map((product) => (
                <li key={product.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{product.name}</p>
                    <p className="text-xs text-ink-muted">
                      From {formatMoney(product.minPrice)}, on sale from{" "}
                      {formatMoney(
                        campaignPrice(product.minPrice, {
                          type: product.discountType,
                          value: product.discountValue,
                        }),
                      )}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums text-ink-secondary">{discountLabel(product)}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Details">
          <dl className="divide-y divide-line">
            <DetailRow label="URL">
              <span className="font-mono">{campaign.slug}</span>
            </DetailRow>
            <DetailRow label="Starts">{formatStoreDateTime(campaign.startsAt)}</DetailRow>
            <DetailRow label="Ends">{formatStoreDateTime(campaign.endsAt)}</DetailRow>
            <DetailRow label="Created">{formatStoreDateTime(campaign.createdAt)}</DetailRow>
          </dl>
          {campaign.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-ink-secondary">{campaign.description}</p>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={confirmingCancel}
        title={`Cancel ${campaign.name}?`}
        description="Its discounts stop straight away and a cancelled campaign can't be restarted."
        confirmLabel="Cancel campaign"
        error={setStatus.isError ? setStatus.error.message : undefined}
        loading={setStatus.isPending}
        onCancel={() => {
          setConfirmingCancel(false);
          setStatus.reset();
        }}
        onConfirm={() =>
          setStatus.mutate({ id: campaign.id, action: "CANCEL" }, { onSuccess: () => setConfirmingCancel(false) })
        }
      />

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${campaign.name}?`}
        description="Its discounts stop straight away. This can't be undone."
        confirmLabel="Delete campaign"
        error={deleteCampaign.isError ? deleteCampaign.error.message : undefined}
        loading={deleteCampaign.isPending}
        onCancel={() => {
          setConfirmingDelete(false);
          deleteCampaign.reset();
        }}
        onConfirm={() =>
          deleteCampaign.mutate(campaign.id, { onSuccess: () => router.push(ADMIN_CAMPAIGNS_PATH) })
        }
      />
    </AdminPage>
  );
}
