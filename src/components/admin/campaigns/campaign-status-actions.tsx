"use client";

import { useState } from "react";
import { useModuleAccess } from "@/components/admin/admin-access";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSetCampaignStatus } from "@/hooks/use-campaign";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { campaignActions, type CampaignAction } from "@/lib/pricing/campaign";
import type { AdminCampaign } from "@/types/campaign";

const ACTION_LABELS: Record<CampaignAction, string> = {
  PUBLISH: "Publish",
  PAUSE: "Pause",
  RESUME: "Resume",
  CANCEL: "Cancel campaign",
};

/** The actions the campaign's status allows, for an admin who may publish. Renders inside a wrapping flex row. */
export function CampaignStatusActions({ campaign }: { campaign: AdminCampaign }) {
  const access = useModuleAccess(PERMISSIONS.campaigns);
  const setStatus = useSetCampaignStatus();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const actions = access.publish ? campaignActions(campaign.status) : [];

  function runAction(action: CampaignAction) {
    if (action === "CANCEL") {
      setConfirmingCancel(true);
      return;
    }
    setStatus.mutate({ id: campaign.id, action });
  }

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action}
          type="button"
          size="sm"
          variant={action === "CANCEL" ? "outline" : undefined}
          loading={setStatus.isPending && setStatus.variables?.action === action}
          disabled={setStatus.isPending}
          onClick={() => runAction(action)}
        >
          {ACTION_LABELS[action]}
        </Button>
      ))}

      {setStatus.isError && !confirmingCancel && (
        <p role="alert" className="w-full text-sm text-danger">
          {setStatus.error.message}
        </p>
      )}

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
    </>
  );
}
