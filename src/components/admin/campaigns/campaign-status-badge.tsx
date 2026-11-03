import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from "@/lib/pricing/campaign";

const STATUS_VARIANTS: Record<CampaignStatus, BadgeProps["variant"]> = {
  DRAFT: "default",
  SCHEDULED: "outline",
  ACTIVE: "live",
  PAUSED: "warn",
  COMPLETED: "soldOut",
  CANCELLED: "soldOut",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className="px-2 py-1 text-[0.625rem]">
      {CAMPAIGN_STATUS_LABELS[status]}
    </Badge>
  );
}
