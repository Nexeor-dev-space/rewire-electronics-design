import { PERCENT_BASE } from "@/lib/pricing/arithmetic";
import type { CouponType } from "@/lib/pricing/types";

/** What an admin sets. The other statuses follow from this and the dates. */
export type CampaignState = "DRAFT" | "PUBLISHED" | "PAUSED" | "CANCELLED";

export const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const CAMPAIGN_ACTIONS = ["PUBLISH", "PAUSE", "RESUME", "CANCEL"] as const;
export type CampaignAction = (typeof CAMPAIGN_ACTIONS)[number];

const STATUS_ACTIONS: Record<CampaignStatus, readonly CampaignAction[]> = {
  DRAFT: ["PUBLISH", "CANCEL"],
  SCHEDULED: ["PAUSE", "CANCEL"],
  ACTIVE: ["PAUSE", "CANCEL"],
  PAUSED: ["RESUME", "CANCEL"],
  COMPLETED: [],
  CANCELLED: [],
};

export const ACTION_STATE: Record<CampaignAction, CampaignState> = {
  PUBLISH: "PUBLISHED",
  PAUSE: "PAUSED",
  RESUME: "PUBLISHED",
  CANCEL: "CANCELLED",
};

export interface CampaignWindow {
  state: CampaignState;
  startsAt: Date;
  endsAt: Date;
}

export function campaignStatus(campaign: CampaignWindow, now: Date): CampaignStatus {
  if (campaign.state === "DRAFT" || campaign.state === "CANCELLED") return campaign.state;
  if (now >= campaign.endsAt) return "COMPLETED";
  if (campaign.state === "PAUSED") return "PAUSED";
  return now < campaign.startsAt ? "SCHEDULED" : "ACTIVE";
}

export function campaignActions(status: CampaignStatus): readonly CampaignAction[] {
  return STATUS_ACTIONS[status];
}

export interface CampaignDiscount {
  type: CouponType;
  value: number;
}

/**
 * The price after a campaign discount. A discount that would make the item
 * free, or that rounds to nothing, is ignored: saving refuses one, but a
 * variant's price can be lowered after the campaign was saved.
 */
export function campaignPrice(price: number, discount: CampaignDiscount | undefined): number {
  if (!discount) return price;
  const off = discount.type === "PERCENT" ? Math.round((price * discount.value) / PERCENT_BASE) : discount.value;
  return off > 0 && off < price ? price - off : price;
}

/**
 * What a shopper sees for a variant. While discounted, the crossed out price
 * is the regular price, whatever the variant's own compare at price says.
 */
export function campaignVariantPrice(
  variant: { price: number; compareAtPrice: number | null },
  discount: CampaignDiscount | undefined,
) {
  const price = campaignPrice(variant.price, discount);
  const campaignDiscounted = price !== variant.price;
  return {
    price,
    compareAtPrice: campaignDiscounted ? variant.price : variant.compareAtPrice,
    campaignDiscounted,
  };
}
