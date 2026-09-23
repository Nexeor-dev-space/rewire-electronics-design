import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import type {
  CategoryType,
  categoryListQuerySchema,
  categorySchema,
  categoryStatusSchema,
} from "@/validators/category.validator";
import { releaseImage } from "./media.service";
import { productCountPhrase } from "./product.service";

/**
 * The category tree for the console. Two levels: a category with `parentId`
 * null is a parent, anything else is a child. The depth cap, name uniqueness
 * and the delete rules all live here — Prisma can express none of them.
 */

type Tx = Prisma.TransactionClient;
type CategoryData = z.output<typeof categorySchema>;
type CategoryQuery = z.output<typeof categoryListQuerySchema>;
type CategoryStatusData = z.output<typeof categoryStatusSchema>;

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  imageId: true,
  description: true,
  status: true,
  showInNav: true,
  sortOrder: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

const CATEGORY_ORDER: Prisma.CategoryOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { name: "asc" },
];

type CategoryRow = Prisma.CategoryGetPayload<{ select: typeof categorySelect }>;

/** Uniqueness ignores case and surrounding space — see the schema comment. */
const nameKeyOf = (name: string) => name.trim().toLowerCase();

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that category. It may have been deleted.", 404);

function toSummary(row: CategoryRow) {
  const type: CategoryType = row.parentId === null ? "parent" : "child";
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type,
    parentId: row.parentId,
    imageUrl: imageUrlOrNull(row.imageId),
    description: row.description,
    status: row.status,
    showInNav: row.showInNav,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  };
}

function categoryFields(data: CategoryData) {
  return {
    name: data.name,
    nameKey: nameKeyOf(data.name),
    slug: data.slug,
    parentId: data.parentId,
    imageId: data.imageId,
    description: data.description,
    status: data.status,
    showInNav: data.showInNav,
    sortOrder: data.sortOrder,
  };
}

const matches = (name: string, search: string) =>
  name.toLowerCase().includes(search.toLowerCase());

/* ---------- reads ---------- */

export async function listCategories(query: CategoryQuery) {
  return query.parentId || query.type ? listFlat(query) : listTree(query);
}

/** The picker and the child listings: one level, no nesting. */
async function listFlat({ page, pageSize, search, type, parentId }: CategoryQuery) {
  const level: Prisma.CategoryWhereInput = parentId
    ? { parentId }
    : type === "parent"
      ? { parentId: null }
      : { parentId: { not: null } };

  const where: Prisma.CategoryWhereInput = {
    ...level,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.category.findMany({
      where,
      select: categorySelect,
      orderBy: CATEGORY_ORDER,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.category.count({ where }),
  ]);

  return { items: rows.map(toSummary), page, pageSize, total };
}

/**
 * The default list: a page of parents, each carrying its children, so the
 * screen renders the mapping from one request. `total` counts parents, which
 * is what the pagination walks.
 */
async function listTree({ page, pageSize, search }: CategoryQuery) {
  // A parent earns its place by matching itself or by having a child that
  // matches. Which of the two decides how its children are filtered below.
  const where: Prisma.CategoryWhereInput = {
    parentId: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { children: { some: { name: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [parents, total] = await prisma.$transaction([
    prisma.category.findMany({
      where,
      select: {
        ...categorySelect,
        _count: { select: { children: true } },
        children: { select: categorySelect, orderBy: CATEGORY_ORDER },
      },
      orderBy: CATEGORY_ORDER,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.category.count({ where }),
  ]);

  const items = parents.map((parent) => {
    // Filtered here rather than in the query: whether to keep all children or
    // only the matching ones depends on the parent's own name, which a single
    // `where` on the relation cannot express.
    const children =
      !search || matches(parent.name, search)
        ? parent.children
        : parent.children.filter((child) => matches(child.name, search));

    return {
      ...toSummary(parent),
      type: "parent" as const,
      parentId: null,
      /** The true count, not the filtered one — it is what the delete rule reads. */
      childCount: parent._count.children,
      children: children.map((child) => ({
        ...toSummary(child),
        type: "child" as const,
        parentId: child.parentId as string,
      })),
    };
  });

  return { items, page, pageSize, total };
}

export async function getCategory(id: string) {
  const row = await prisma.category.findUnique({
    where: { id },
    select: { ...categorySelect, _count: { select: { children: true } } },
  });
  if (!row) throw notFound();

  return { ...toSummary(row), imageId: row.imageId, childCount: row._count.children };
}

/* ---------- writes ---------- */

export async function createCategory(data: CategoryData) {
  const id = await prisma.$transaction(async (tx) => {
    await assertNameFree(tx, nameKeyOf(data.name));
    await assertSlugFree(tx, data.slug);
    if (data.parentId !== null) await assertUsableParent(tx, data.parentId);

    const created = await tx.category.create({
      data: categoryFields(data),
      select: { id: true },
    });
    return created.id;
  });

  return getCategory(id);
}

export async function updateCategory(id: string, data: CategoryData) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.category.findUnique({
      where: { id },
      select: { imageId: true, _count: { select: { children: true } } },
    });
    if (!current) throw notFound();

    await assertNameFree(tx, nameKeyOf(data.name), id);
    await assertSlugFree(tx, data.slug, id);

    if (data.parentId !== null) {
      if (data.parentId === id) {
        const message = "A category can't be its own parent.";
        throw new ServiceError("VALIDATION", message, 422, { parentId: [message] });
      }

      // The depth cap: making this a child would put its children three deep.
      if (current._count.children > 0) {
        const message = `${childCountPhrase(current._count.children)} sit under this category, so it can't become a child itself.`;
        throw new ServiceError("CONFLICT", message, 409, { type: [message] });
      }

      await assertUsableParent(tx, data.parentId);
    }

    await tx.category.update({
      where: { id },
      data: categoryFields(data),
    });

    if (current.imageId !== null && current.imageId !== data.imageId) {
      await releaseImage(tx, current.imageId);
    }
  });

  return getCategory(id);
}

export async function setCategoryStatus(id: string, { status }: CategoryStatusData) {
  const { count } = await prisma.category.updateMany({ where: { id }, data: { status } });
  if (count === 0) throw notFound();
  return getCategory(id);
}

export async function deleteCategory(id: string) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.category.findUnique({
      where: { id },
      select: {
        name: true,
        imageId: true,
        _count: { select: { children: true, products: true } },
      },
    });
    if (!current) throw notFound();

    if (current._count.children > 0) {
      const count = current._count.children;
      throw new ServiceError(
        "CONFLICT",
        `${current.name} has ${childCountPhrase(count)}. Move or delete ${count === 1 ? "it" : "them"} first.`,
        409,
      );
    }

    if (current._count.products > 0) {
      throw new ServiceError(
        "CONFLICT",
        `${current.name} has ${productCountPhrase(current._count.products)}. Move or delete them first.`,
        409,
      );
    }

    await tx.category.delete({ where: { id } });
    if (current.imageId !== null) await releaseImage(tx, current.imageId);
  });

  return { id };
}

/* ---------- rules ---------- */

const childCountPhrase = (count: number) =>
  `${count} child ${count === 1 ? "category" : "categories"}`;

async function assertNameFree(tx: Tx, nameKey: string, exceptId?: string) {
  const owner = await tx.category.findUnique({ where: { nameKey }, select: { id: true } });
  if (owner && owner.id !== exceptId) {
    const message = "A category with this name already exists.";
    throw new ServiceError("CONFLICT", message, 409, { name: [message] });
  }
}

async function assertSlugFree(tx: Tx, slug: string, exceptId?: string) {
  const owner = await tx.category.findUnique({ where: { slug }, select: { id: true } });
  if (owner && owner.id !== exceptId) {
    const message = "Another category already uses this URL slug.";
    throw new ServiceError("CONFLICT", message, 409, { slug: [message] });
  }
}

/** A child's parent must exist and must itself be top level. */
async function assertUsableParent(tx: Tx, parentId: string) {
  const parent = await tx.category.findUnique({
    where: { id: parentId },
    select: { parentId: true },
  });

  if (!parent) {
    const message = "That parent category no longer exists.";
    throw new ServiceError("VALIDATION", message, 422, { parentId: [message] });
  }

  if (parent.parentId !== null) {
    const message = "Choose a top-level category as the parent.";
    throw new ServiceError("VALIDATION", message, 422, { parentId: [message] });
  }
}
