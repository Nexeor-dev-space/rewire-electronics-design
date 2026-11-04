import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { CAMPAIGN_DATES_LOCK_KEY, MAX_CAMPAIGN_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { imageUrl, imageUrlOrNull } from "@/lib/storage/image-storage";
import {
  ACTION_STATE,
  CAMPAIGN_STATUS_LABELS,
  campaignActions,
  campaignStatus,
  type CampaignAction,
  type CampaignDiscount,
  type CampaignStatus,
} from "@/lib/pricing/campaign";
import type {
  campaignListQuerySchema,
  campaignSchema,
  campaignTypeSchema,
} from "@/validators/campaign.validator";
import { imageExists, releaseImage } from "./media.service";

type Tx = Prisma.TransactionClient;
type CampaignData = z.output<typeof campaignSchema>;
type CampaignQuery = z.output<typeof campaignListQuerySchema>;
type CampaignTypeData = z.output<typeof campaignTypeSchema>;

const listSelect = {
  id: true,
  name: true,
  slug: true,
  startsAt: true,
  endsAt: true,
  state: true,
  createdAt: true,
  type: { select: { id: true, name: true } },
  _count: { select: { products: true } },
} satisfies Prisma.CampaignSelect;

const detailSelect = {
  ...listSelect,
  description: true,
  content: true,
  bannerImageId: true,
  ctaLabel: true,
  ctaHref: true,
  release: { select: { id: true, title: true } },
  images: { select: { mediaId: true }, orderBy: { sortOrder: "asc" } },
  updatedAt: true,
  products: {
    select: {
      discountType: true,
      discountValue: true,
      product: { select: { id: true, name: true, minPrice: true } },
    },
    orderBy: { product: { name: "asc" } },
  },
} satisfies Prisma.CampaignSelect;

type ListRow = Prisma.CampaignGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.CampaignGetPayload<{ select: typeof detailSelect }>;

const ORDER_BY: Record<CampaignQuery["sort"], Prisma.CampaignOrderByWithRelationInput[]> = {
  "created-desc": [{ createdAt: "desc" }, { id: "desc" }],
  "created-asc": [{ createdAt: "asc" }, { id: "asc" }],
  "start-desc": [{ startsAt: "desc" }, { id: "desc" }],
  "start-asc": [{ startsAt: "asc" }, { id: "asc" }],
};

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that campaign. It may have been deleted.", 404);

const typeNotFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that campaign type. It may have been deleted.", 404);

function invalid(field: string, message: string) {
  return new ServiceError("VALIDATION", message, 422, { [field]: [message] });
}

function conflict(field: string, message: string) {
  return new ServiceError("CONFLICT", message, 409, { [field]: [message] });
}

function toListItem({ state, _count, ...row }: ListRow, now: Date) {
  return { ...row, status: campaignStatus({ ...row, state }, now), productCount: _count.products };
}

function toDetail(row: DetailRow, now: Date) {
  return {
    ...toListItem(row, now),
    description: row.description,
    content: row.content,
    bannerImageId: row.bannerImageId,
    bannerImageUrl: imageUrlOrNull(row.bannerImageId),
    images: row.images.map(({ mediaId }) => ({ mediaId, url: imageUrl(mediaId) })),
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    release: row.release,
    updatedAt: row.updatedAt,
    products: row.products.map(({ discountType, discountValue, product }) => ({
      ...product,
      discountType,
      discountValue,
    })),
  };
}

function statusWhere(status: CampaignStatus, now: Date): Prisma.CampaignWhereInput {
  switch (status) {
    case "DRAFT":
      return { state: "DRAFT" };
    case "CANCELLED":
      return { state: "CANCELLED" };
    case "PAUSED":
      return { state: "PAUSED", endsAt: { gt: now } };
    case "SCHEDULED":
      return { state: "PUBLISHED", startsAt: { gt: now } };
    case "ACTIVE":
      return { state: "PUBLISHED", startsAt: { lte: now }, endsAt: { gt: now } };
    case "COMPLETED":
      return { state: { in: ["PUBLISHED", "PAUSED"] }, endsAt: { lte: now } };
  }
}

/* ---------- prices ---------- */

/**
 * The discount each product has right now, from the running campaign. Paused,
 * cancelled and finished campaigns match nothing, so prices return to normal
 * at the end date with nothing to run.
 */
export async function liveCampaignDiscounts(
  db: Tx,
  productIds: string[],
  now: Date,
): Promise<Map<string, CampaignDiscount>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.campaignProduct.findMany({
    where: {
      productId: { in: productIds },
      campaign: { state: "PUBLISHED", startsAt: { lte: now }, endsAt: { gt: now } },
    },
    select: { productId: true, discountType: true, discountValue: true },
  });
  return new Map(rows.map((row) => [row.productId, { type: row.discountType, value: row.discountValue }]));
}

/* ---------- reads ---------- */

export async function listCampaigns({ page, pageSize, search, status, typeId, sort }: CampaignQuery) {
  const now = new Date();
  const where: Prisma.CampaignWhereInput = {
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(typeId ? { typeId } : {}),
    ...(status ? statusWhere(status, now) : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.campaign.findMany({
      where,
      select: listSelect,
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campaign.count({ where }),
  ]);

  return { items: rows.map((row) => toListItem(row, now)), page, pageSize, total };
}

export async function getCampaign(id: string) {
  const row = await prisma.campaign.findUnique({ where: { id }, select: detailSelect });
  if (!row) throw notFound();
  return toDetail(row, new Date());
}

/* ---------- rules ---------- */

async function assertSlugFree(tx: Tx, slug: string, exceptId?: string) {
  const owner = await tx.campaign.findUnique({ where: { slug }, select: { id: true } });
  if (owner && owner.id !== exceptId) throw conflict("slug", "That URL is already used by another campaign.");
}

async function assertTypeExists(tx: Tx, typeId: string) {
  const found = await tx.campaignType.count({ where: { id: typeId } });
  if (found === 0) throw invalid("typeId", "That campaign type no longer exists.");
}

async function assertProductsValid(tx: Tx, products: CampaignData["products"]) {
  if (products.length === 0) return;
  const rows = await tx.product.findMany({
    where: { id: { in: products.map((product) => product.productId) }, deletedAt: null },
    select: { id: true, name: true, minPrice: true },
  });
  if (rows.length !== products.length) throw invalid("products", "One of the products no longer exists.");

  const found = new Map(rows.map((row) => [row.id, row]));
  for (const { productId, discountType, discountValue } of products) {
    const product = found.get(productId);
    if (product && discountType === "FIXED" && discountValue >= product.minPrice) {
      throw invalid(
        "products",
        `The discount on ${product.name} must be less than its lowest price, ${formatMoney(product.minPrice)}.`,
      );
    }
  }
}

async function assertContentValid(tx: Tx, data: CampaignData) {
  if (data.bannerImageId !== null && !(await imageExists(tx, data.bannerImageId))) {
    throw invalid("bannerImageId", "The banner no longer exists. Upload it again.");
  }
  const images = await tx.mediaAsset.count({ where: { id: { in: data.imageIds } } });
  if (images !== data.imageIds.length) {
    throw invalid("imageIds", "One of the images no longer exists. Upload it again.");
  }
  if (data.releaseId !== null && (await tx.release.count({ where: { id: data.releaseId } })) === 0) {
    throw invalid("releaseId", "That release no longer exists.");
  }
}

/**
 * Only one campaign can run at a time. Drafts and cancelled campaigns hold no
 * dates; a finished one holds none from now on. The lock makes two admins
 * publishing at once take turns, so the check can't be raced.
 */
async function assertDatesFree(tx: Tx, startsAt: Date, endsAt: Date, now: Date, exceptId?: string) {
  if (endsAt <= now) return;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CAMPAIGN_DATES_LOCK_KEY}::bigint)`;

  const effectiveStart = startsAt > now ? startsAt : now;
  const clash = await tx.campaign.findFirst({
    where: {
      id: exceptId ? { not: exceptId } : undefined,
      state: { in: ["PUBLISHED", "PAUSED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: effectiveStart },
    },
    select: { name: true, state: true, startsAt: true, endsAt: true },
  });
  if (clash) {
    const label = CAMPAIGN_STATUS_LABELS[campaignStatus(clash, now)].toLowerCase();
    throw conflict(
      "startsAt",
      `These dates overlap ${clash.name}, which is ${label}. Only one campaign can run at a time.`,
    );
  }
}

/* ---------- writes ---------- */

function campaignFields(data: CampaignData) {
  return {
    name: data.name,
    description: data.description,
    slug: data.slug,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    typeId: data.typeId,
    content: data.content,
    bannerImageId: data.bannerImageId,
    ctaLabel: data.ctaLabel,
    ctaHref: data.ctaHref,
    releaseId: data.releaseId,
    products: { create: data.products },
    images: { create: data.imageIds.map((mediaId, sortOrder) => ({ mediaId, sortOrder })) },
  };
}

const campaignImagesSelect = {
  bannerImageId: true,
  images: { select: { mediaId: true } },
} satisfies Prisma.CampaignSelect;

function campaignImageIds(row: Prisma.CampaignGetPayload<{ select: typeof campaignImagesSelect }>) {
  return [...(row.bannerImageId === null ? [] : [row.bannerImageId]), ...row.images.map((image) => image.mediaId)];
}

/** Always starts as a Draft; going live is a separate action with its own permission. */
export async function createCampaign(data: CampaignData) {
  const id = await prisma.$transaction(async (tx) => {
    await assertSlugFree(tx, data.slug);
    await assertTypeExists(tx, data.typeId);
    await assertProductsValid(tx, data.products);
    await assertContentValid(tx, data);
    const created = await tx.campaign.create({ data: campaignFields(data), select: { id: true } });
    return created.id;
  });
  return getCampaign(id);
}

export async function updateCampaign(id: string, data: CampaignData) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.campaign.findUnique({
      where: { id },
      select: { state: true, ...campaignImagesSelect },
    });
    if (!current) throw notFound();

    await assertSlugFree(tx, data.slug, id);
    await assertTypeExists(tx, data.typeId);
    await assertProductsValid(tx, data.products);
    await assertContentValid(tx, data);
    if (current.state === "PUBLISHED" || current.state === "PAUSED") {
      if (data.products.length === 0) throw invalid("products", "Add at least one product.");
      await assertDatesFree(tx, new Date(data.startsAt), new Date(data.endsAt), new Date(), id);
    }

    await tx.campaignProduct.deleteMany({ where: { campaignId: id } });
    await tx.campaignImage.deleteMany({ where: { campaignId: id } });
    await tx.campaign.update({ where: { id }, data: campaignFields(data) });

    const kept = new Set<string | null>([data.bannerImageId, ...data.imageIds]);
    for (const mediaId of campaignImageIds(current)) {
      if (!kept.has(mediaId)) await releaseImage(tx, mediaId);
    }
  });
  return getCampaign(id);
}

export async function setCampaignStatus(id: string, action: CampaignAction) {
  await prisma.$transaction(async (tx) => {
    const row = await tx.campaign.findUnique({ where: { id }, select: detailSelect });
    if (!row) throw notFound();

    const now = new Date();
    const { status } = toListItem(row, now);
    if (!campaignActions(status).includes(action)) {
      throw new ServiceError("CONFLICT", `A ${CAMPAIGN_STATUS_LABELS[status].toLowerCase()} campaign can't do that.`, 409);
    }

    const state = ACTION_STATE[action];
    if (state === "PUBLISHED") {
      if (row.endsAt <= now) throw invalid("endsAt", "The end date has passed. Choose a later one.");
      if (row.products.length === 0) throw invalid("products", "Add at least one product before publishing.");
      await assertProductsValid(
        tx,
        row.products.map(({ discountType, discountValue, product }) => ({
          productId: product.id,
          discountType,
          discountValue,
        })),
      );
      await assertDatesFree(tx, row.startsAt, row.endsAt, now, id);
    }

    await tx.campaign.update({ where: { id }, data: { state } });
  });
  return getCampaign(id);
}

export async function deleteCampaign(id: string) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.campaign.findUnique({ where: { id }, select: campaignImagesSelect });
    if (!current) throw notFound();

    await tx.campaign.delete({ where: { id } });
    for (const mediaId of campaignImageIds(current)) await releaseImage(tx, mediaId);
  });
  return { id };
}

/* ---------- types ---------- */

const typeSelect = {
  id: true,
  name: true,
  _count: { select: { campaigns: true } },
} satisfies Prisma.CampaignTypeSelect;

type TypeRow = Prisma.CampaignTypeGetPayload<{ select: typeof typeSelect }>;

const toType = ({ _count, ...row }: TypeRow) => ({ ...row, campaignCount: _count.campaigns });

const nameKeyOf = (name: string) => name.toLowerCase();

async function assertTypeNameFree(nameKey: string, exceptId?: string) {
  const owner = await prisma.campaignType.findUnique({ where: { nameKey }, select: { id: true } });
  if (owner && owner.id !== exceptId) throw conflict("name", "That type already exists.");
}

export async function listCampaignTypes(page: number, pageSize: number) {
  const [rows, total] = await prisma.$transaction([
    prisma.campaignType.findMany({
      select: typeSelect,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campaignType.count(),
  ]);
  return { items: rows.map(toType), page, pageSize, total };
}

export async function getCampaignType(id: string) {
  const row = await prisma.campaignType.findUnique({ where: { id }, select: typeSelect });
  if (!row) throw typeNotFound();
  return toType(row);
}

export async function createCampaignType({ name }: CampaignTypeData) {
  const nameKey = nameKeyOf(name);
  await assertTypeNameFree(nameKey);
  if ((await prisma.campaignType.count()) >= MAX_CAMPAIGN_TYPES) {
    throw conflict("name", `You can have up to ${MAX_CAMPAIGN_TYPES} types. Remove one first.`);
  }
  return toType(await prisma.campaignType.create({ data: { name, nameKey }, select: typeSelect }));
}

export async function updateCampaignType(id: string, { name }: CampaignTypeData) {
  const nameKey = nameKeyOf(name);
  await assertTypeNameFree(nameKey, id);
  const { count } = await prisma.campaignType.updateMany({ where: { id }, data: { name, nameKey } });
  if (count === 0) throw typeNotFound();
  return getCampaignType(id);
}

export async function deleteCampaignType(id: string) {
  const { campaignCount } = await getCampaignType(id);
  if (campaignCount > 0) {
    const noun = campaignCount === 1 ? "campaign uses" : "campaigns use";
    throw new ServiceError("CONFLICT", `${campaignCount} ${noun} this type. Change or delete them first.`, 409);
  }
  await prisma.campaignType.deleteMany({ where: { id } });
  return { id };
}
