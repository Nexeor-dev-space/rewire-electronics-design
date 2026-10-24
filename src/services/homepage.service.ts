import "server-only";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { formatStoreDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  MAX_HOMEPAGE_SECTIONS,
  SECTION_RULES,
  checkSectionFields,
  isWithinSchedule,
  type HomepageSectionType,
} from "@/lib/homepage-sections";
import { SHOP_INDEX_HREF, productHrefForCategory } from "@/lib/route-map";
import { productHref } from "@/lib/shop";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import { availabilityFromStock } from "@/types";
import type { ShopCard } from "@/types/catalogue";
import type {
  HomepageSectionItem,
  PublishedDeal,
  PublishedDrop,
  PublishedItem,
  PublishedReview,
  PublishedSection,
  SectionItemCategory,
  SectionItemProduct,
} from "@/types/homepage";
import type {
  createHomepageSectionSchema,
  homepageSectionItemSchema,
  homepageSectionSchema,
} from "@/validators/homepage.validator";
import {
  PUBLISHED,
  SHOP_VARIANT_ORDER,
  VISIBLE_CATEGORY,
  findShopCards,
  isOnSale,
} from "./catalogue.service";
import { imageExists, releaseImage } from "./media.service";

/**
 * The homepage as rows. Every section exists twice: DRAFT, which the console
 * edits, and LIVE, which the storefront reads. Publish replaces LIVE with a
 * copy of DRAFT and discard does the reverse, each in one transaction, so a
 * half-finished arrangement never reaches shoppers. A section's items (drops,
 * Just Listed picks, reviews, featured categories) belong to it and are
 * copied with it.
 *
 * Only DRAFT rows are ever addressed by id. A LIVE id answers 404.
 */

type Tx = Prisma.TransactionClient;
type Stage = "DRAFT" | "LIVE";
type SectionData = z.output<typeof homepageSectionSchema>;
type ItemData = z.output<typeof homepageSectionItemSchema>;
type CreateSectionData = z.output<typeof createHomepageSectionSchema>;

const STATE_ID = "homepage";

const itemSelect = {
  id: true,
  visible: true,
  productId: true,
  categoryId: true,
  title: true,
  body: true,
  author: true,
  rating: true,
  releaseAt: true,
  ctaLabel: true,
  ctaHref: true,
  imageId: true,
} satisfies Prisma.HomepageSectionItemSelect;

const sectionSelect = {
  id: true,
  type: true,
  sortOrder: true,
  visible: true,
  seasonal: true,
  eyebrow: true,
  title: true,
  subtitle: true,
  description: true,
  ctaLabel: true,
  ctaHref: true,
  startsAt: true,
  endsAt: true,
  imageId: true,
  mobileImageId: true,
  refIds: true,
  items: { select: itemSelect, orderBy: { sortOrder: "asc" } },
  updatedAt: true,
} satisfies Prisma.HomepageSectionSelect;

type SectionRow = Prisma.HomepageSectionGetPayload<{ select: typeof sectionSelect }>;
type ItemRow = SectionRow["items"][number];

/** Every image a row holds: its own, its mobile one and its items'. */
const imagesSelect = {
  imageId: true,
  mobileImageId: true,
  items: { select: { imageId: true } },
} satisfies Prisma.HomepageSectionSelect;

type ImagesRow = Prisma.HomepageSectionGetPayload<{ select: typeof imagesSelect }>;

interface RefRow {
  id: string;
  name: string;
  imageId: string | null;
  /** Where the storefront card links. */
  href: string;
}

interface CategoryRow extends SectionItemCategory {
  parentName: string | null;
  imageId: string | null;
  href: string;
}

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that section. It may have been deleted.", 404);

/* ---------- console reads ---------- */

export async function getHomepageDraft() {
  const [rows, state] = await prisma.$transaction([
    prisma.homepageSection.findMany({
      where: { stage: "DRAFT" },
      select: sectionSelect,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.homepageState.findUnique({ where: { id: STATE_ID } }),
  ]);
  const [refs, products, categories] = await Promise.all([
    loadRefs(rows),
    loadItemProducts(rows),
    loadItemCategories(rows),
  ]);

  return {
    sections: rows.map((row) => ({
      id: row.id,
      type: row.type,
      visible: row.visible,
      seasonal: row.seasonal,
      eyebrow: row.eyebrow,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      ctaLabel: row.ctaLabel,
      ctaHref: row.ctaHref,
      imageId: row.imageId,
      imageUrl: imageUrlOrNull(row.imageId),
      mobileImageId: row.mobileImageId,
      mobileImageUrl: imageUrlOrNull(row.mobileImageId),
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      refs: refsOf(row, refs).map(({ id, name }) => ({ id, name })),
      items: row.items.map((item): HomepageSectionItem => ({
        id: item.id,
        visible: item.visible,
        productId: item.productId,
        product: item.productId ? (products.get(item.productId) ?? null) : null,
        categoryId: item.categoryId,
        category: categoryOf(item, categories),
        title: item.title,
        body: item.body,
        author: item.author,
        rating: item.rating,
        releaseAt: item.releaseAt?.toISOString() ?? null,
        ctaLabel: item.ctaLabel,
        ctaHref: item.ctaHref,
        imageId: item.imageId,
        imageUrl: imageUrlOrNull(item.imageId),
      })),
      updatedAt: row.updatedAt,
    })),
    hasUnpublishedChanges:
      state === null
        ? rows.length > 0
        : state.publishedAt === null || state.draftUpdatedAt > state.publishedAt,
    publishedAt: state?.publishedAt ?? null,
  };
}

/** One draft section as the builder shows it; the change log's previous value. */
export async function findDraftSection(id: string) {
  const section = (await getHomepageDraft()).sections.find((row) => row.id === id);
  if (!section) throw notFound();
  return section;
}

/* ---------- draft writes ---------- */

export async function addHomepageSection(data: CreateSectionData) {
  await prisma.$transaction(async (tx) => {
    await lockHomepage(tx);
    const count = await tx.homepageSection.count({ where: { stage: "DRAFT" } });
    if (count >= MAX_HOMEPAGE_SECTIONS) {
      throw new ServiceError(
        "CONFLICT",
        `The homepage holds up to ${MAX_HOMEPAGE_SECTIONS} sections. Delete one before adding another.`,
        409,
      );
    }

    if (SECTION_RULES[data.type].singleton) {
      const existing = await tx.homepageSection.count({ where: { stage: "DRAFT", type: data.type } });
      if (existing > 0) {
        throw new ServiceError(
          "CONFLICT",
          `The homepage already has a ${SECTION_RULES[data.type].label.toLowerCase()} section. Edit that one instead.`,
          409,
        );
      }
    }

    await assertSectionValid(tx, data.type, data);

    const last = await tx.homepageSection.findFirst({
      where: { stage: "DRAFT" },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    await tx.homepageSection.create({
      data: {
        ...columnsOf(data),
        stage: "DRAFT",
        type: data.type,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        items: { create: data.items.map(itemColumnsOf) },
      },
    });
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

export async function updateHomepageSection(id: string, data: SectionData) {
  await prisma.$transaction(async (tx) => {
    await lockHomepage(tx);
    const current = await tx.homepageSection.findFirst({
      where: { id, stage: "DRAFT" },
      select: { type: true, ...imagesSelect },
    });
    if (!current) throw notFound();

    await assertSectionValid(tx, current.type, data);
    // Items are replaced wholesale, like a product's images and specs.
    await tx.homepageSectionItem.deleteMany({ where: { sectionId: id } });
    await tx.homepageSection.update({
      where: { id },
      data: { ...columnsOf(data), items: { create: data.items.map(itemColumnsOf) } },
    });

    // Every image the old version held. The LIVE copy may still point at
    // some; releaseImage keeps any that a row of either stage still uses.
    await releaseImages(tx, [current]);
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

export async function deleteHomepageSection(id: string) {
  await prisma.$transaction(async (tx) => {
    await lockHomepage(tx);
    const current = await tx.homepageSection.findFirst({
      where: { id, stage: "DRAFT" },
      select: { type: true, ...imagesSelect },
    });
    if (!current) throw notFound();

    if (SECTION_RULES[current.type].fixed) {
      throw new ServiceError(
        "CONFLICT",
        "This section is part of the page and can't be deleted. Hide it instead.",
        409,
      );
    }

    await tx.homepageSection.delete({ where: { id } });
    await releaseImages(tx, [current]);
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

/** `ids` must be exactly the draft's ids, each once, in the new order. */
export async function reorderHomepageSections(ids: string[]) {
  await prisma.$transaction(async (tx) => {
    await lockHomepage(tx);
    const rows = await tx.homepageSection.findMany({
      where: { stage: "DRAFT" },
      select: { id: true },
    });
    const current = new Set(rows.map((row) => row.id));

    const matches =
      new Set(ids).size === ids.length &&
      ids.length === current.size &&
      ids.every((id) => current.has(id));
    if (!matches) {
      throw new ServiceError(
        "VALIDATION",
        "The page changed since you loaded it. Reload and try again.",
        422,
      );
    }

    for (const [index, id] of ids.entries()) {
      await tx.homepageSection.update({ where: { id }, data: { sortOrder: index } });
    }
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

/* ---------- publishing ---------- */

export async function publishHomepage() {
  await prisma.$transaction(async (tx) => {
    await lockHomepage(tx);
    const draft = await tx.homepageSection.findMany({
      where: { stage: "DRAFT" },
      select: sectionSelect,
      orderBy: { sortOrder: "asc" },
    });
    if (draft.length === 0) {
      throw new ServiceError(
        "CONFLICT",
        "There's nothing to publish. The draft has no sections.",
        409,
      );
    }

    const oldLive = await tx.homepageSection.findMany({
      where: { stage: "LIVE" },
      select: imagesSelect,
    });

    // Items go with their sections (cascade).
    await tx.homepageSection.deleteMany({ where: { stage: "LIVE" } });
    await copySections(tx, draft, "LIVE");
    // After the copy, so an image both versions share is still referenced.
    await releaseImages(tx, oldLive);

    const now = new Date();
    await tx.homepageState.upsert({
      where: { id: STATE_ID },
      create: { id: STATE_ID, draftUpdatedAt: now, publishedAt: now },
      update: { publishedAt: now },
    });
  });

  revalidatePath("/");
  return getHomepageDraft();
}

export async function discardHomepageDraft() {
  await prisma.$transaction(async (tx) => {
    await lockHomepage(tx);
    const state = await tx.homepageState.findUnique({ where: { id: STATE_ID } });
    if (!state?.publishedAt) {
      throw new ServiceError(
        "CONFLICT",
        "Nothing has been published yet, so there's no live version to go back to.",
        409,
      );
    }

    const live = await tx.homepageSection.findMany({
      where: { stage: "LIVE" },
      select: sectionSelect,
      orderBy: { sortOrder: "asc" },
    });
    const oldDraft = await tx.homepageSection.findMany({
      where: { stage: "DRAFT" },
      select: imagesSelect,
    });

    await tx.homepageSection.deleteMany({ where: { stage: "DRAFT" } });
    await copySections(tx, live, "DRAFT");
    await releaseImages(tx, oldDraft);

    // The draft now equals what is live, so there is nothing unpublished.
    await tx.homepageState.update({
      where: { id: STATE_ID },
      data: { draftUpdatedAt: state.publishedAt },
    });
  });

  return getHomepageDraft();
}

/* ---------- storefront ---------- */

/** The storefront's homepage: visible live sections. */
export function getPublishedHomepage(): Promise<PublishedSection[]> {
  return getHomepageSections("LIVE");
}

/**
 * Visible sections of `stage` in order, read fresh on every request — not
 * cached. The homepage renders per request anyway (`force-dynamic`), and a
 * cache here outlived the seed (which runs outside Next and can't clear it)
 * and served an empty homepage. Reading fresh also means a renamed,
 * unpublished or deleted brand, category or product leaves the page
 * immediately, and a drop's status follows its stock and release date.
 * DRAFT feeds the staff preview, LIVE the storefront.
 */
export async function getHomepageSections(stage: Stage): Promise<PublishedSection[]> {
  const rows = await prisma.homepageSection.findMany({
    where: { stage, visible: true },
    select: sectionSelect,
    orderBy: { sortOrder: "asc" },
  });

  const productIds = rows.flatMap((row) =>
    row.items.flatMap((item) => (item.visible && item.productId ? [item.productId] : [])),
  );
  const [refs, cards, categories] = await Promise.all([
    loadRefs(rows),
    findShopCards([...new Set(productIds)]),
    loadItemCategories(rows),
  ]);
  const now = new Date();

  return rows.flatMap((row) => {
    const kind = SECTION_RULES[row.type].refs;
    const itemKind = SECTION_RULES[row.type].items;
    if (
      stage === "LIVE" &&
      SECTION_RULES[row.type].schedule &&
      !isWithinSchedule(row.startsAt, row.endsAt, now)
    ) {
      return [];
    }
    const shown = row.items.filter((item) => item.visible);
    const items =
      itemKind === "categories"
        ? shown.flatMap((item) => toCategoryCard(item, categories) ?? [])
        : refsOf(row, refs).map((ref) => ({
            id: ref.id,
            name: ref.name,
            imageUrl: imageUrlOrNull(ref.imageId),
            href: ref.href,
          }));
    const drops =
      itemKind === "drops" ? shown.flatMap((item) => toDrop(item, cards, now) ?? []) : [];
    const reviews = itemKind === "reviews" ? shown.flatMap((item) => toReview(item) ?? []) : [];
    // Picks the shop can't sell right now are skipped; with none left the
    // shelf falls back to the newest products.
    const products =
      itemKind === "products"
        ? shown.flatMap((item) => {
            const card = item.productId ? cards.get(item.productId) : undefined;
            return card && card.stock > 0 ? [card] : [];
          })
        : [];
    const deals = itemKind === "deals" ? shown.flatMap((item) => toDeal(item, cards) ?? []) : [];

    // Every chosen brand deleted or category unpublished, every drop or
    // review hidden or gone, or a title missing from a hand-edited row:
    // render nothing rather than empty chrome.
    if (
      ((kind !== null || itemKind === "categories") && items.length === 0) ||
      (itemKind === "drops" && drops.length === 0) ||
      (itemKind === "reviews" && reviews.length === 0) ||
      (itemKind === "deals" && deals.length === 0) ||
      !row.title
    ) {
      return [];
    }

    return [
      {
        id: row.id,
        type: row.type,
        seasonal: row.seasonal,
        eyebrow: row.eyebrow,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        ctaLabel: row.ctaLabel,
        ctaHref: row.ctaHref,
        imageUrl: imageUrlOrNull(row.imageId),
        // Phones fall back to the main image.
        mobileImageUrl: imageUrlOrNull(row.mobileImageId ?? row.imageId),
        items,
        drops,
        products,
        reviews,
        deals,
      },
    ];
  });
}

function toDeal(item: ItemRow, cards: Map<string, ShopCard>): PublishedDeal | null {
  if (item.productId) {
    const card = cards.get(item.productId);
    return card && card.stock > 0 ? { kind: "product", id: item.id, card } : null;
  }
  if (!item.title || !item.ctaHref) return null;
  return {
    kind: "promo",
    id: item.id,
    title: item.title,
    imageUrl: imageUrlOrNull(item.imageId),
    href: item.ctaHref,
  };
}

/**
 * A drop card from its product, read now: price, stock and picture are the
 * catalogue's, and the status follows the release date and stock. A drop
 * without a product is a teaser for a release not in the catalogue yet; it
 * shows only until its release date. Null when there is nothing to show — a
 * product the shop wouldn't list, or a teaser whose date has passed.
 */
function toDrop(item: ItemRow, cards: Map<string, ShopCard>, now: Date): PublishedDrop | null {
  const upcoming = item.releaseAt !== null && item.releaseAt > now;
  const releaseAt = item.releaseAt?.toISOString() ?? null;
  const shared = {
    id: item.id,
    releaseAt,
    opensAt: upcoming && releaseAt ? formatStoreDateTime(releaseAt) : null,
    ctaLabel: item.ctaLabel,
    ctaHref: item.ctaHref,
  };

  if (item.productId) {
    const card = cards.get(item.productId);
    if (!card) return null;
    const availability = availabilityFromStock(card.stock);
    return {
      ...shared,
      slug: card.slug,
      name: item.title ?? card.name,
      brand: card.brand,
      variant: [card.variant, card.storage].filter(Boolean).join(" · ") || null,
      status: upcoming
        ? "coming-soon"
        : availability === "sold-out"
          ? "sold-out"
          : availability === "low-stock"
            ? "almost-gone"
            : "available",
      price: card.price,
      originalPrice: card.originalPrice,
      unitsLeft: card.stock,
      // The product's own picture; the item's upload only when it has none.
      imageUrl: card.imageUrl ?? imageUrlOrNull(item.imageId),
      imageAlt: card.imageAlt,
      href: productHref(card),
    };
  }

  if (!upcoming || !item.title) return null;
  return {
    ...shared,
    slug: null,
    name: item.title,
    brand: null,
    variant: null,
    status: "coming-soon",
    price: null,
    originalPrice: null,
    unitsLeft: null,
    imageUrl: imageUrlOrNull(item.imageId),
    imageAlt: item.title,
    href: null,
  };
}

function toCategoryCard(item: ItemRow, categories: Map<string, CategoryRow>): PublishedItem | null {
  const category = item.categoryId ? categories.get(item.categoryId) : undefined;
  if (!category?.onStorefront) return null;
  return {
    id: item.id,
    name: item.title ?? category.name,
    imageUrl: imageUrlOrNull(item.imageId ?? category.imageId),
    href: item.ctaHref ?? category.href,
  };
}

function toReview(item: ItemRow): PublishedReview | null {
  if (!item.body || !item.author) return null;
  return {
    id: item.id,
    quote: item.body,
    author: item.author,
    product: item.title,
    rating: item.rating,
    avatarUrl: imageUrlOrNull(item.imageId),
  };
}

/* ---------- rules ---------- */

async function assertSectionValid(tx: Tx, type: HomepageSectionType, data: SectionData) {
  const errors = checkSectionFields(type, data);
  if (Object.keys(errors).length > 0) {
    throw new ServiceError("VALIDATION", "Please check the highlighted fields.", 422, errors);
  }

  if (SECTION_RULES[type].refs === "brands") {
    const found = await tx.brand.count({ where: { id: { in: data.refIds } } });
    if (found !== data.refIds.length) {
      const message = "One of the chosen brands no longer exists. Remove it and try again.";
      throw new ServiceError("VALIDATION", message, 422, { refIds: [message] });
    }
  }

  const categoryIds = [
    ...new Set(data.items.flatMap((item) => (item.categoryId ? [item.categoryId] : []))),
  ];
  if (categoryIds.length > 0) {
    const found = await tx.category.count({ where: { id: { in: categoryIds } } });
    if (found !== categoryIds.length) {
      const message = "One of the chosen categories no longer exists. Remove it and try again.";
      throw new ServiceError("VALIDATION", message, 422, { items: [message] });
    }
  }

  // Any product that exists may be chosen. Draft, archived and Trashed ones
  // are skipped on the storefront until they are listed again, so a product
  // moved to Trash never blocks saving — or hiding — the section it is in.
  const productIds = [
    ...new Set(data.items.flatMap((item) => (item.productId ? [item.productId] : []))),
  ];
  if (productIds.length > 0) {
    const found = await tx.product.count({ where: { id: { in: productIds } } });
    if (found !== productIds.length) {
      const message = "One of the chosen products no longer exists. Remove it and try again.";
      throw new ServiceError("VALIDATION", message, 422, { items: [message] });
    }
  }

  for (const [field, imageId] of [
    ["imageId", data.imageId],
    ["mobileImageId", data.mobileImageId],
  ] as const) {
    if (imageId !== null && !(await imageExists(tx, imageId))) {
      const message = "That image no longer exists. Upload it again.";
      throw new ServiceError("VALIDATION", message, 422, { [field]: [message] });
    }
  }
  for (const [index, item] of data.items.entries()) {
    if (item.imageId !== null && !(await imageExists(tx, item.imageId))) {
      const message = "That image no longer exists. Upload it again.";
      throw new ServiceError("VALIDATION", message, 422, { [`items.${index}.imageId`]: [message] });
    }
  }
}

/* ---------- helpers ---------- */

function columnsOf(data: SectionData) {
  return {
    visible: data.visible,
    seasonal: data.seasonal,
    eyebrow: data.eyebrow,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    ctaLabel: data.ctaLabel,
    ctaHref: data.ctaHref,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    imageId: data.imageId,
    mobileImageId: data.mobileImageId,
    refIds: data.refIds,
  };
}

function itemColumnsOf(
  item: ItemData | Omit<ItemRow, "id">,
  index: number,
): Prisma.HomepageSectionItemUncheckedCreateWithoutSectionInput {
  return {
    sortOrder: index,
    visible: item.visible,
    productId: item.productId,
    categoryId: item.categoryId,
    title: item.title,
    body: item.body,
    author: item.author,
    rating: item.rating,
    // A body carries an ISO string; a row being copied, a Date.
    releaseAt: typeof item.releaseAt === "string" ? new Date(item.releaseAt) : item.releaseAt,
    ctaLabel: item.ctaLabel,
    ctaHref: item.ctaHref,
    imageId: item.imageId,
  };
}

/**
 * Recreates `rows` as `stage`, with their items. Ids are new, picked here so
 * each item knows its section's id before anything is inserted: two inserts
 * however many sections there are.
 */
async function copySections(tx: Tx, rows: SectionRow[], stage: Stage) {
  const copies = rows.map((row) => ({ id: randomUUID(), row }));

  await tx.homepageSection.createMany({
    data: copies.map(({ id, row }) => ({
      id,
      stage,
      type: row.type,
      sortOrder: row.sortOrder,
      visible: row.visible,
      seasonal: row.seasonal,
      eyebrow: row.eyebrow,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      ctaLabel: row.ctaLabel,
      ctaHref: row.ctaHref,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      imageId: row.imageId,
      mobileImageId: row.mobileImageId,
      refIds: row.refIds,
    })),
  });

  const items = copies.flatMap(({ id, row }) =>
    row.items.map((item, index) => ({ ...itemColumnsOf(item, index), sectionId: id })),
  );
  if (items.length > 0) await tx.homepageSectionItem.createMany({ data: items });
}

async function releaseImages(tx: Tx, rows: ImagesRow[]) {
  const ids = new Set(
    rows.flatMap((row) =>
      [row.imageId, row.mobileImageId, ...row.items.map((item) => item.imageId)].filter(
        (id): id is string => id !== null,
      ),
    ),
  );
  for (const id of ids) await releaseImage(tx, id);
}

/**
 * Every homepage write takes this lock first, so writes run one at a time.
 * Without it two overlapping publishes each copy the draft and LIVE ends up
 * with every section twice, and an edit committing mid-publish is stamped
 * older than the publish and reads as "Up to date". The insert makes sure a
 * fresh database has a row to lock; a transaction that then throws rolls it
 * back.
 */
async function lockHomepage(tx: Tx) {
  await tx.$executeRaw`
    INSERT INTO homepage_state (id, "draftUpdatedAt", "createdAt", "updatedAt")
    VALUES (${STATE_ID}, now(), now(), now())
    ON CONFLICT (id) DO NOTHING`;
  await tx.$queryRaw`SELECT id FROM homepage_state WHERE id = ${STATE_ID} FOR UPDATE`;
}

async function touchDraft(tx: Tx) {
  const now = new Date();
  await tx.homepageState.upsert({
    where: { id: STATE_ID },
    create: { id: STATE_ID, draftUpdatedAt: now },
    update: { draftUpdatedAt: now },
  });
}

/**
 * The products the draft's items point at, as the builder shows them, with
 * whether the storefront would list each. Products in Trash are still named
 * so the builder can say why one is missing from the page.
 */
async function loadItemProducts(rows: Pick<SectionRow, "items">[]) {
  const ids = [
    ...new Set(
      rows.flatMap((row) => row.items.flatMap((item) => (item.productId ? [item.productId] : []))),
    ),
  ];
  if (ids.length === 0) return new Map<string, SectionItemProduct>();

  const [products, listed] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        images: { select: { mediaId: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { select: { price: true, compareAtPrice: true }, orderBy: SHOP_VARIANT_ORDER, take: 1 },
      },
    }),
    prisma.product.findMany({ where: { id: { in: ids }, ...PUBLISHED }, select: { id: true } }),
  ]);
  const onStorefront = new Set(listed.map((row) => row.id));

  return new Map<string, SectionItemProduct>(
    products.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        imageUrl: imageUrlOrNull(row.images[0]?.mediaId ?? null),
        onStorefront: onStorefront.has(row.id),
        onSale: isOnSale(row.variants),
      },
    ]),
  );
}

/** Every brand the rows point at, fetched once, with the shop link each opens. */
async function loadRefs(rows: Pick<SectionRow, "type" | "refIds">[]) {
  const brandIds = rows
    .filter((row) => SECTION_RULES[row.type].refs === "brands")
    .flatMap((row) => row.refIds);
  if (brandIds.length === 0) return new Map<string, RefRow>();

  const brands = await prisma.brand.findMany({
    where: { id: { in: brandIds } },
    select: { id: true, name: true, imageId: true },
  });
  // The shop matches brands by name.
  return new Map(
    brands.map((row): [string, RefRow] => [
      row.id,
      { ...row, href: `${SHOP_INDEX_HREF}?brand=${encodeURIComponent(row.name)}` },
    ]),
  );
}

/** A row's brands that still exist, in its stored order. */
function refsOf(row: Pick<SectionRow, "type" | "refIds">, refs: Map<string, RefRow>): RefRow[] {
  if (SECTION_RULES[row.type].refs !== "brands") return [];
  return row.refIds.flatMap((id) => refs.get(id) ?? []);
}

async function loadItemCategories(rows: Pick<SectionRow, "items">[]) {
  const ids = [
    ...new Set(
      rows.flatMap((row) => row.items.flatMap((item) => (item.categoryId ? [item.categoryId] : []))),
    ),
  ];
  if (ids.length === 0) return new Map<string, CategoryRow>();

  const [categories, visible] = await Promise.all([
    prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, imageId: true, parent: { select: { name: true } } },
    }),
    prisma.category.findMany({ where: { id: { in: ids }, ...VISIBLE_CATEGORY }, select: { id: true } }),
  ]);
  const onStorefront = new Set(visible.map((row) => row.id));

  return new Map(
    categories.map((row): [string, CategoryRow] => [
      row.id,
      {
        id: row.id,
        name: row.name,
        parentName: row.parent?.name ?? null,
        imageId: row.imageId,
        imageUrl: imageUrlOrNull(row.imageId),
        href: productHrefForCategory(row.slug),
        onStorefront: onStorefront.has(row.id),
      },
    ]),
  );
}

function categoryOf(
  item: ItemRow,
  categories: Map<string, CategoryRow>,
): SectionItemCategory | null {
  const category = item.categoryId ? categories.get(item.categoryId) : undefined;
  if (!category) return null;
  return {
    id: category.id,
    name: category.parentName ? `${category.parentName} › ${category.name}` : category.name,
    imageUrl: category.imageUrl,
    onStorefront: category.onStorefront,
  };
}
