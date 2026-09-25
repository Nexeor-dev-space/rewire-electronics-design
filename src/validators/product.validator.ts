import { z } from "zod";
import {
  idValidator,
  minorUnitsValidator,
  paginationQueryValidator,
  slugValidator,
} from "./common/primitives.validator";

export const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_CONDITIONS = ["NEW", "OPEN_BOX", "PRE_OWNED", "REFURBISHED"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_GRADES = ["PREMIUM", "EXCELLENT", "VERY_GOOD", "GOOD"] as const;
export type ProductGrade = (typeof PRODUCT_GRADES)[number];

export const GRADED_CONDITIONS: readonly ProductCondition[] = ["PRE_OWNED", "REFURBISHED"];

export const MAX_VARIANTS = 30;
export const MAX_IMAGES = 12;
export const MAX_SPECS = 60;
export const MAX_HIGHLIGHTS = 6;
export const MAX_INCLUDED = 20;
export const MAX_STOCK = 100_000;

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
const SKU = /^[A-Za-z0-9._-]+$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .nullable()
    .default(null)
    .transform((value) => value || null);

export const stockValidator = z
  .number({ error: "Enter a stock count." })
  .int("Use a whole number.")
  .min(0, "Stock can't be negative.")
  .max(MAX_STOCK, `Stock can't exceed ${MAX_STOCK}.`);

export const productListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  categoryId: idValidator.optional(),
  brandId: idValidator.optional(),
});

export const productVariantSchema = z
  .object({
    id: idValidator.optional(),
    sku: z
      .string()
      .trim()
      .min(1, "Enter a SKU.")
      .max(64, "Use 64 characters or fewer.")
      .regex(SKU, "Use letters, numbers, dots, dashes or underscores."),
    storage: optionalText(40),
    colour: optionalText(40),
    colourHex: optionalText(7).refine(
      (value) => value === null || HEX_COLOUR.test(value),
      "Use a hex colour like #1A1A1A.",
    ),
    condition: z.enum(PRODUCT_CONDITIONS, { error: "Choose a condition." }),
    grade: z.enum(PRODUCT_GRADES).nullable().default(null),
    batteryHealth: z
      .number()
      .int()
      .min(0)
      .max(100, "Battery health is a percentage.")
      .nullable()
      .default(null),
    price: minorUnitsValidator.min(1, "Enter a price above zero."),
    compareAtPrice: minorUnitsValidator.nullable().default(null),
    stock: stockValidator,
  })
  .superRefine((variant, ctx) => {
    if (variant.grade !== null && !GRADED_CONDITIONS.includes(variant.condition)) {
      ctx.addIssue({
        code: "custom",
        path: ["grade"],
        message: "Only pre-owned and refurbished variants carry a grade.",
      });
    }
    if (variant.compareAtPrice !== null && variant.compareAtPrice <= variant.price) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPrice"],
        message: "The original price must be higher than the selling price.",
      });
    }
  });

export const productImageSchema = z.object({
  mediaId: idValidator,
  alt: z.string().trim().max(160).default(""),
  colour: optionalText(40),
});

export const productSpecSchema = z.object({
  group: z.string().trim().min(1, "Enter a spec group.").max(60),
  label: z.string().trim().min(1, "Enter a spec label.").max(80),
  value: z.string().trim().min(1, "Enter a spec value.").max(200),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a product name.").max(120, "Use 120 characters or fewer."),
    slug: slugValidator.max(140, "Use 140 characters or fewer."),
    description: z.string().trim().max(5000, "Use 5000 characters or fewer.").default(""),
    brandId: z.string().min(1, "Choose a brand."),
    categoryId: z.string().min(1, "Choose a category."),
    warrantyMonths: z.number().int().min(0).max(60, "Use 60 months or fewer.").default(12),
    highlights: z.array(z.string().trim().min(1).max(160)).max(MAX_HIGHLIGHTS).default([]),
    included: z.array(z.string().trim().min(1).max(120)).max(MAX_INCLUDED).default([]),
    images: z.array(productImageSchema).max(MAX_IMAGES, `Add up to ${MAX_IMAGES} images.`).default([]),
    specs: z.array(productSpecSchema).max(MAX_SPECS, `Add up to ${MAX_SPECS} specs.`).default([]),
    variants: z
      .array(productVariantSchema)
      .min(1, "Add at least one variant.")
      .max(MAX_VARIANTS, `Add up to ${MAX_VARIANTS} variants.`),
  })
  .superRefine((data, ctx) => {
    const skus = new Set<string>();
    const options = new Set<string>();
    data.variants.forEach((variant, index) => {
      const sku = variant.sku.toLowerCase();
      if (skus.has(sku)) {
        ctx.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "Each variant needs its own SKU." });
      }
      skus.add(sku);

      const option = [variant.condition, variant.grade, variant.storage, variant.colour]
        .map((value) => value ?? "")
        .join("|")
        .toLowerCase();
      if (options.has(option)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index],
          message: "Two variants have the same condition, grade, storage and colour.",
        });
      }
      options.add(option);
    });

    const mediaIds = data.images.map((image) => image.mediaId);
    if (new Set(mediaIds).size !== mediaIds.length) {
      ctx.addIssue({ code: "custom", path: ["images"], message: "The same image is added twice." });
    }

    const colours = new Set(data.variants.flatMap((variant) => (variant.colour ? [variant.colour] : [])));
    data.images.forEach((image, index) => {
      if (image.colour !== null && !colours.has(image.colour)) {
        ctx.addIssue({
          code: "custom",
          path: ["images", index, "colour"],
          message: "Pick a colour that one of the variants uses.",
        });
      }
    });
  });

export const productStatusSchema = z.object({
  status: z.enum(PRODUCT_STATUSES, { error: "Choose a status." }),
});
