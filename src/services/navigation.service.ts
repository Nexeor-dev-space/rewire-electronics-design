import "server-only";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { defaultNavigation, toPublishedNavigation } from "@/lib/navigation-config";
import type { NavigationConfig, NavigationDraft, PublishedNavigation } from "@/types/navigation";
import { navigationSchema, type NavigationInput } from "@/validators/navigation.validator";

/**
 * Storefront navigation: one row, three versions (draft, live, previous).
 * With no row, or no live version yet, the storefront shows the default, which
 * is today's navigation, so nothing needs seeding. See docs/NAVIGATION.md.
 */

const STATE_ID = "navigation";

type Tx = Prisma.TransactionClient;
type Row = Prisma.NavigationStateGetPayload<object>;

/** A stored version, or null when it no longer passes the schema. */
function parseConfig(value: Prisma.JsonValue | null): NavigationConfig | null {
  const parsed = navigationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const sameConfig = (a: NavigationConfig, b: NavigationConfig) => JSON.stringify(a) === JSON.stringify(b);

const asJson = (config: NavigationConfig) => config as unknown as Prisma.InputJsonValue;

/** The version shoppers see: the live one, else the default. */
function liveOf(row: Row | null): NavigationConfig {
  return (row && parseConfig(row.live)) ?? defaultNavigation();
}

function toDraft(row: Row | null): NavigationDraft {
  const live = liveOf(row);
  const draft = (row && parseConfig(row.draft)) ?? live;
  return {
    draft,
    hasUnpublishedChanges: !sameConfig(draft, live),
    publishedAt: row?.publishedAt?.toISOString() ?? null,
    canRestore: row !== null && parseConfig(row.previous) !== null,
  };
}

/* ---------- reads ---------- */

export async function getNavigationDraft(): Promise<NavigationDraft> {
  return toDraft(await prisma.navigationState.findUnique({ where: { id: STATE_ID } }));
}

/**
 * The storefront read: hidden links and empty groups already removed. If the
 * read fails (for example the table is not migrated yet) the page still
 * renders, with the default navigation, rather than taking the storefront down.
 */
export async function getPublishedNavigation(): Promise<PublishedNavigation> {
  try {
    const row = await prisma.navigationState.findUnique({ where: { id: STATE_ID } });
    return toPublishedNavigation(liveOf(row));
  } catch (error) {
    console.error("getPublishedNavigation failed, using the default navigation", error);
    return toPublishedNavigation(defaultNavigation());
  }
}

/** The staff preview: the draft as shoppers would see it. */
export async function getDraftPreviewNavigation(): Promise<PublishedNavigation> {
  return toPublishedNavigation((await getNavigationDraft()).draft);
}

/* ---------- writes ---------- */

/**
 * Locks the row, creating it first on a fresh database, so two publishes or a
 * publish and a save cannot interleave. The transaction that then throws rolls
 * the insert back.
 */
async function lockNavigation(tx: Tx): Promise<Row> {
  await tx.$executeRaw`
    INSERT INTO navigation_state (id, draft, "createdAt", "updatedAt")
    VALUES (${STATE_ID}, ${JSON.stringify(defaultNavigation())}::jsonb, now(), now())
    ON CONFLICT (id) DO NOTHING`;
  await tx.$queryRaw`SELECT id FROM navigation_state WHERE id = ${STATE_ID} FOR UPDATE`;
  return tx.navigationState.findUniqueOrThrow({ where: { id: STATE_ID } });
}

export async function saveNavigationDraft(input: NavigationInput): Promise<NavigationDraft> {
  const row = await prisma.$transaction(async (tx) => {
    await lockNavigation(tx);
    return tx.navigationState.update({ where: { id: STATE_ID }, data: { draft: asJson(input) } });
  });
  return toDraft(row);
}

export async function publishNavigation(): Promise<NavigationDraft> {
  const row = await prisma.$transaction(async (tx) => {
    const current = await lockNavigation(tx);
    const live = liveOf(current);
    const draft = parseConfig(current.draft) ?? live;
    if (sameConfig(draft, live)) {
      throw new ServiceError("CONFLICT", "There's nothing to publish. The draft matches what is live.", 409);
    }
    return tx.navigationState.update({
      where: { id: STATE_ID },
      data: { previous: asJson(live), live: asJson(draft), publishedAt: new Date() },
    });
  });
  revalidatePath("/", "layout");
  return toDraft(row);
}

/** Brings the previous version back live; the replaced one becomes the previous, so it can be undone. */
export async function restorePreviousNavigation(): Promise<NavigationDraft> {
  const row = await prisma.$transaction(async (tx) => {
    const current = await lockNavigation(tx);
    const previous = parseConfig(current.previous);
    if (!previous) {
      throw new ServiceError("CONFLICT", "There is no earlier version to restore.", 409);
    }
    return tx.navigationState.update({
      where: { id: STATE_ID },
      data: {
        live: asJson(previous),
        previous: asJson(liveOf(current)),
        draft: asJson(previous),
        publishedAt: new Date(),
      },
    });
  });
  revalidatePath("/", "layout");
  return toDraft(row);
}

/** The draft goes back to exactly what is live. */
export async function discardNavigationDraft(): Promise<NavigationDraft> {
  const row = await prisma.$transaction(async (tx) => {
    const current = await lockNavigation(tx);
    return tx.navigationState.update({
      where: { id: STATE_ID },
      data: { draft: asJson(liveOf(current)) },
    });
  });
  return toDraft(row);
}
