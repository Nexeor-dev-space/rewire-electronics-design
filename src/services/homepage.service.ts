import "server-only";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import {
  MAX_HOMEPAGE_SECTIONS,
  SECTION_RULES,
  checkSectionFields,
  type HomepageSectionType,
} from "@/lib/homepage-sections";
import { SHOP_INDEX_HREF, productHrefForCategory } from "@/lib/route-map";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import type { PublishedSection } from "@/types/homepage";
import type {
  createHomepageSectionSchema,
  homepageSectionSchema,
} from "@/validators/homepage.validator";
import { VISIBLE_CATEGORY } from "./catalogue.service";
import { imageExists, releaseImage } from "./media.service";

/**
 * The homepage as rows. Every section exists twice: DRAFT, which the console
 * edits, and LIVE, which the storefront reads. Publish replaces LIVE with a
 * copy of DRAFT and discard does the reverse, each in one transaction, so a
 * half-finished arrangement never reaches shoppers.
 *
 * Only DRAFT rows are ever addressed by id. A LIVE id answers 404.
 */

type Tx = Prisma.TransactionClient;
type Stage = "DRAFT" | "LIVE";
type SectionData = z.output<typeof homepageSectionSchema>;
type CreateSectionData = z.output<typeof createHomepageSectionSchema>;

const STATE_ID = "homepage";

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
  imageId: true,
  refIds: true,
  updatedAt: true,
} satisfies Prisma.HomepageSectionSelect;

type SectionRow = Prisma.HomepageSectionGetPayload<{ select: typeof sectionSelect }>;

interface RefRow {
  id: string;
  name: string;
  imageId: string | null;
  /** Where the storefront card links. */
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
  const refs = await loadRefs(rows);

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
      refs: refsOf(row, refs).map(({ id, name }) => ({ id, name })),
      updatedAt: row.updatedAt,
    })),
    hasUnpublishedChanges:
      state === null
        ? rows.length > 0
        : state.publishedAt === null || state.draftUpdatedAt > state.publishedAt,
    publishedAt: state?.publishedAt ?? null,
  };
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
      select: { type: true, imageId: true },
    });
    if (!current) throw notFound();

    await assertSectionValid(tx, current.type, data);
    await tx.homepageSection.update({ where: { id }, data: columnsOf(data) });

    // The LIVE copy may still point at the old image; releaseImage keeps it
    // while any row of either stage does.
    if (current.imageId !== null && current.imageId !== data.imageId) {
      await releaseImage(tx, current.imageId);
    }
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

export async function deleteHomepageSection(id: string) {
  await prisma.$transaction(async (tx) => {
    await lockHomepage(tx);
    const current = await tx.homepageSection.findFirst({
      where: { id, stage: "DRAFT" },
      select: { type: true, imageId: true },
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
    if (current.imageId !== null) await releaseImage(tx, current.imageId);
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
      select: { imageId: true },
    });

    await tx.homepageSection.deleteMany({ where: { stage: "LIVE" } });
    await tx.homepageSection.createMany({ data: draft.map((row) => copyAs(row, "LIVE")) });
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
      select: { imageId: true },
    });

    await tx.homepageSection.deleteMany({ where: { stage: "DRAFT" } });
    await tx.homepageSection.createMany({ data: live.map((row) => copyAs(row, "DRAFT")) });
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
 * unpublished or deleted brand or category leaves the page immediately.
 * DRAFT feeds the staff preview, LIVE the storefront.
 */
export async function getHomepageSections(stage: Stage): Promise<PublishedSection[]> {
  const rows = await prisma.homepageSection.findMany({
    where: { stage, visible: true },
    select: sectionSelect,
    orderBy: { sortOrder: "asc" },
  });
  const refs = await loadRefs(rows, { visibleOnly: true });

  return rows.flatMap((row) => {
    const kind = SECTION_RULES[row.type].refs;
    const items = refsOf(row, refs).map((ref) => ({
      id: ref.id,
      name: ref.name,
      imageUrl: imageUrlOrNull(ref.imageId),
      href: ref.href,
    }));

    // Every chosen brand deleted or category unpublished, or a title missing
    // from a hand-edited row: render nothing rather than empty chrome.
    if ((kind !== null && items.length === 0) || !row.title) return [];

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
        items,
      },
    ];
  });
}

/* ---------- rules ---------- */

async function assertSectionValid(tx: Tx, type: HomepageSectionType, data: SectionData) {
  const errors = checkSectionFields(type, data);
  if (Object.keys(errors).length > 0) {
    throw new ServiceError("VALIDATION", "Please check the highlighted fields.", 422, errors);
  }

  const kind = SECTION_RULES[type].refs;
  if (kind !== null) {
    const where = { id: { in: data.refIds } };
    const found =
      kind === "brands" ? await tx.brand.count({ where }) : await tx.category.count({ where });
    if (found !== data.refIds.length) {
      const message =
        kind === "brands"
          ? "One of the chosen brands no longer exists. Remove it and try again."
          : "One of the chosen categories no longer exists. Remove it and try again.";
      throw new ServiceError("VALIDATION", message, 422, { refIds: [message] });
    }
  }

  if (data.imageId !== null && !(await imageExists(tx, data.imageId))) {
    const message = "That image no longer exists. Upload it again.";
    throw new ServiceError("VALIDATION", message, 422, { imageId: [message] });
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
    imageId: data.imageId,
    refIds: data.refIds,
  };
}

function copyAs(row: SectionRow, stage: Stage): Prisma.HomepageSectionCreateManyInput {
  return {
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
    imageId: row.imageId,
    refIds: row.refIds,
  };
}

async function releaseImages(tx: Tx, rows: { imageId: string | null }[]) {
  const ids = new Set(rows.flatMap((row) => (row.imageId === null ? [] : [row.imageId])));
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
 * Every brand and category the rows point at, fetched once per kind, with the
 * shop link each opens. `visibleOnly` is the storefront's view: categories the
 * shop wouldn't show (draft, archived, or under an unpublished parent) are
 * left out. The admin API sees every category that still exists.
 */
async function loadRefs(
  rows: Pick<SectionRow, "type" | "refIds">[],
  { visibleOnly = false }: { visibleOnly?: boolean } = {},
) {
  const idsFor = (kind: "brands" | "categories") =>
    rows.filter((row) => SECTION_RULES[row.type].refs === kind).flatMap((row) => row.refIds);

  const brandIds = idsFor("brands");
  const categoryIds = idsFor("categories");

  const [brands, categories] = await Promise.all([
    brandIds.length > 0
      ? prisma.brand.findMany({
          where: { id: { in: brandIds } },
          select: { id: true, name: true, imageId: true },
        })
      : Promise.resolve([]),
    categoryIds.length > 0
      ? prisma.category.findMany({
          where: { id: { in: categoryIds }, ...(visibleOnly ? VISIBLE_CATEGORY : {}) },
          select: { id: true, name: true, imageId: true, slug: true },
        })
      : Promise.resolve([]),
  ]);

  // The shop matches brands by name, and serves categories at their slug.
  const brandRefs: RefRow[] = brands.map((row) => ({
    ...row,
    href: `${SHOP_INDEX_HREF}?brand=${encodeURIComponent(row.name)}`,
  }));
  const categoryRefs: RefRow[] = categories.map(({ slug, ...row }) => ({
    ...row,
    href: productHrefForCategory(slug),
  }));

  return {
    brands: new Map(brandRefs.map((row) => [row.id, row])),
    categories: new Map(categoryRefs.map((row) => [row.id, row])),
  };
}

/** A row's refs that still exist, in its stored order. */
function refsOf(
  row: Pick<SectionRow, "type" | "refIds">,
  refs: Awaited<ReturnType<typeof loadRefs>>,
): RefRow[] {
  const kind = SECTION_RULES[row.type].refs;
  if (kind === null) return [];
  const table = refs[kind];
  return row.refIds.flatMap((id) => table.get(id) ?? []);
}
