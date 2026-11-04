import { z } from "zod";
import {
  CAMPAIGN_CONTENT_MAX_LENGTH,
  CAMPAIGN_CTA_HREF_MAX_LENGTH,
  CAMPAIGN_CTA_LABEL_MAX_LENGTH,
  CAMPAIGN_DESCRIPTION_MAX_LENGTH,
  CAMPAIGN_MAX_PERCENT,
  CAMPAIGN_NAME_MAX_LENGTH,
  CAMPAIGN_SLUG_MAX_LENGTH,
  CAMPAIGN_TYPE_NAME_MAX_LENGTH,
  MAX_CAMPAIGN_IMAGES,
  MAX_CAMPAIGN_PRODUCTS,
  SEARCH_QUERY_MAX_LENGTH,
} from "@/lib/constants";
import { CAMPAIGN_ACTIONS, CAMPAIGN_STATUSES } from "@/lib/pricing/campaign";
import { COUPON_TYPES } from "./coupon.validator";
import {
  idValidator,
  isoDateTimeValidator,
  optionalTextValidator,
  paginationQueryValidator,
  slugValidator,
} from "./common/primitives.validator";
import { optionalHref } from "./homepage.validator";

export const CAMPAIGN_SORTS = ["created-desc", "created-asc", "start-desc", "start-asc"] as const;

export const campaignListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  typeId: idValidator.optional(),
  sort: z.enum(CAMPAIGN_SORTS).default("created-desc"),
});

const campaignProductSchema = z.object({
  productId: idValidator,
  discountType: z.enum(COUPON_TYPES, { error: "Choose a discount type." }),
  discountValue: z.number().int("Enter a whole number.").min(1, "Enter a discount above zero."),
});

export const campaignSchema = z
  .object({
    name: z
      .string("Enter a campaign name.")
      .trim()
      .min(1, "Enter a campaign name.")
      .max(CAMPAIGN_NAME_MAX_LENGTH, `Use ${CAMPAIGN_NAME_MAX_LENGTH} characters or fewer.`),
    description: z
      .string()
      .trim()
      .max(CAMPAIGN_DESCRIPTION_MAX_LENGTH, `Use ${CAMPAIGN_DESCRIPTION_MAX_LENGTH} characters or fewer.`)
      .default(""),
    slug: slugValidator.max(CAMPAIGN_SLUG_MAX_LENGTH, `Use ${CAMPAIGN_SLUG_MAX_LENGTH} characters or fewer.`),
    typeId: z.string("Choose a campaign type.").min(1, "Choose a campaign type."),
    startsAt: isoDateTimeValidator,
    endsAt: isoDateTimeValidator,
    products: z
      .array(campaignProductSchema)
      .max(MAX_CAMPAIGN_PRODUCTS, `Add ${MAX_CAMPAIGN_PRODUCTS} products or fewer.`)
      .default([]),
    content: z
      .string()
      .trim()
      .max(CAMPAIGN_CONTENT_MAX_LENGTH, `Use ${CAMPAIGN_CONTENT_MAX_LENGTH} characters or fewer.`)
      .default(""),
    bannerImageId: idValidator.nullable().default(null),
    imageIds: z
      .array(idValidator)
      .max(MAX_CAMPAIGN_IMAGES, `Add ${MAX_CAMPAIGN_IMAGES} images or fewer.`)
      .default([]),
    ctaLabel: optionalTextValidator(CAMPAIGN_CTA_LABEL_MAX_LENGTH),
    ctaHref: optionalHref(CAMPAIGN_CTA_HREF_MAX_LENGTH),
    releaseId: idValidator.nullable().default(null),
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.endsAt) <= Date.parse(data.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End after the start date." });
    }
    if (data.ctaLabel && !data.ctaHref) {
      ctx.addIssue({ code: "custom", path: ["ctaHref"], message: "Enter where the button goes." });
    }
    if (data.ctaHref && !data.ctaLabel) {
      ctx.addIssue({ code: "custom", path: ["ctaLabel"], message: "Enter the button text." });
    }
    if (new Set(data.imageIds).size !== data.imageIds.length) {
      ctx.addIssue({ code: "custom", path: ["imageIds"], message: "Each image can only be added once." });
    }
    if (new Set(data.products.map((product) => product.productId)).size !== data.products.length) {
      ctx.addIssue({ code: "custom", path: ["products"], message: "Each product can only be added once." });
    }
    const percentTooHigh = data.products.some(
      (product) => product.discountType === "PERCENT" && product.discountValue > CAMPAIGN_MAX_PERCENT,
    );
    if (percentTooHigh) {
      ctx.addIssue({
        code: "custom",
        path: ["products"],
        message: `Use a percentage from 1 to ${CAMPAIGN_MAX_PERCENT}.`,
      });
    }
  });

export const campaignStatusSchema = z.object({
  action: z.enum(CAMPAIGN_ACTIONS, { error: "Choose an action." }),
});

export const campaignTypeSchema = z.object({
  name: z
    .string("Enter a type name.")
    .trim()
    .min(1, "Enter a type name.")
    .max(CAMPAIGN_TYPE_NAME_MAX_LENGTH, `Use ${CAMPAIGN_TYPE_NAME_MAX_LENGTH} characters or fewer.`),
});
