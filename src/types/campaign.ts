import type { z } from "zod";
import type { CampaignAction, CampaignStatus } from "@/lib/pricing/campaign";
import type { CouponType } from "@/lib/pricing/types";
import type { CAMPAIGN_SORTS, campaignSchema, campaignTypeSchema } from "@/validators/campaign.validator";
import type { NamedRef } from "./product";

export interface AdminCampaignType {
  id: string;
  name: string;
  campaignCount: number;
}

export interface AdminCampaignProduct {
  id: string;
  name: string;
  discountType: CouponType;
  discountValue: number;
  /** The cheapest variant's regular price, in fils. */
  minPrice: number;
}

export interface AdminCampaignListItem {
  id: string;
  name: string;
  slug: string;
  type: NamedRef;
  startsAt: string;
  endsAt: string;
  status: CampaignStatus;
  productCount: number;
  createdAt: string;
}

export interface AdminCampaignImage {
  mediaId: string;
  url: string;
}

export interface AdminCampaign extends AdminCampaignListItem {
  description: string;
  content: string;
  bannerImageId: string | null;
  bannerImageUrl: string | null;
  images: AdminCampaignImage[];
  ctaLabel: string | null;
  ctaHref: string | null;
  release: { id: string; title: string } | null;
  products: AdminCampaignProduct[];
  updatedAt: string;
}

export type CampaignSort = (typeof CAMPAIGN_SORTS)[number];

export type CampaignFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CampaignStatus;
  typeId?: string;
  sort?: CampaignSort;
};

export type CampaignInput = z.input<typeof campaignSchema>;
export type CampaignTypeInput = z.input<typeof campaignTypeSchema>;
export type CampaignStatusInput = { action: CampaignAction };
