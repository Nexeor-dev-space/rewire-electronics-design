import "server-only";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { HELP_PAGE_PATH } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { defaultGuide, findGuideDefinition, guideDefinitions } from "@/lib/user-guides/catalogue";
import type { Guide, GuideAudience } from "@/lib/user-guides/types";
import { recordAudit } from "@/services/audit.service";
import { imageExists } from "@/services/media.service";
import type { SessionUser } from "@/types/auth";
import { helpGuideSchema, type HelpGuideInput } from "@/validators/help-guide.validator";

/**
 * Help guides. The built in text lives in `src/lib/user-guides`; a row here
 * is a staff edited version of one guide and wins over the built in text.
 * With no row the built in text shows, so nothing needs seeding.
 * See docs/USER-GUIDES.md.
 */

type Row = Prisma.HelpGuideGetPayload<object>;

/** A saved guide laid over its built in text, or the built in text when the row no longer passes the schema. */
function mergeRow(base: Guide, row: Row | undefined): Guide {
  if (!row) return base;
  const parsed = helpGuideSchema.safeParse({
    title: row.title,
    summary: row.summary,
    recordingUrl: row.recordingUrl ?? "",
    sections: row.sections,
  });
  if (!parsed.success) return base;

  return {
    ...base,
    ...parsed.data,
    sections: parsed.data.sections.map((section) => ({ ...section, intro: section.intro || undefined })),
    updatedAt: row.updatedAt.toISOString(),
    edited: true,
  };
}

/**
 * Reading never fails a page: if the table cannot be read (for example the
 * migration has not run yet) the built in text shows, as it does with no edits.
 */
async function readSafely<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error("help guide read failed, showing built in text", error);
    return fallback;
  }
}

/** Every guide of one audience, in catalogue order. */
export async function listGuides(audience: GuideAudience): Promise<Guide[]> {
  const rows = await readSafely(() => prisma.helpGuide.findMany({ where: { audience } }), []);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return guideDefinitions(audience).map((definition) =>
    mergeRow(defaultGuide(definition), bySlug.get(definition.slug)),
  );
}

export async function getGuide(audience: GuideAudience, slug: string): Promise<Guide | null> {
  const definition = findGuideDefinition(audience, slug);
  if (!definition) return null;
  const row = await readSafely(
    () => prisma.helpGuide.findUnique({ where: { audience_slug: { audience, slug } } }),
    null,
  );
  return mergeRow(defaultGuide(definition), row ?? undefined);
}

function requireDefinition(audience: GuideAudience, slug: string) {
  const definition = findGuideDefinition(audience, slug);
  if (!definition) throw new ServiceError("NOT_FOUND", "We couldn't find that guide.", 404);
  return definition;
}

/** Customer guides show on the storefront, so a change there refreshes those pages. */
function refresh(audience: GuideAudience) {
  if (audience === "customer") revalidatePath(HELP_PAGE_PATH, "layout");
}

const imageIdsOf = (input: HelpGuideInput) => [
  ...new Set(input.sections.flatMap((section) => section.steps.flatMap((step) => (step.imageId ? [step.imageId] : [])))),
];

export async function saveGuide(
  actor: SessionUser,
  audience: GuideAudience,
  slug: string,
  input: HelpGuideInput,
): Promise<Guide> {
  const definition = requireDefinition(audience, slug);
  const before = await getGuide(audience, slug);
  const imageIds = imageIdsOf(input);

  await prisma.$transaction(async (tx) => {
    for (const imageId of imageIds) {
      if (!(await imageExists(tx, imageId))) {
        throw new ServiceError("VALIDATION", "A screenshot no longer exists. Upload it again.", 422);
      }
    }

    const data = {
      title: input.title,
      summary: input.summary,
      recordingUrl: input.recordingUrl,
      sections: input.sections as unknown as Prisma.InputJsonValue,
    };
    const row = await tx.helpGuide.upsert({
      where: { audience_slug: { audience, slug } },
      create: { audience, slug, ...data },
      update: data,
      select: { id: true },
    });

    await tx.helpGuideImage.deleteMany({ where: { guideId: row.id } });
    await tx.helpGuideImage.createMany({
      data: imageIds.map((mediaId) => ({ guideId: row.id, mediaId })),
    });
  });

  const after = (await getGuide(audience, slug)) as Guide;
  await recordAudit(actor, {
    action: "UPDATE",
    module: PERMISSIONS.helpGuides,
    recordId: `${audience}:${slug}`,
    recordLabel: definition.title,
    before: before && snapshot(before),
    after: snapshot(after),
  });
  refresh(audience);
  return after;
}

/** Removes the staff edits so the built in text shows again. */
export async function resetGuide(actor: SessionUser, audience: GuideAudience, slug: string): Promise<Guide> {
  const definition = requireDefinition(audience, slug);
  const before = await getGuide(audience, slug);
  await prisma.helpGuide.deleteMany({ where: { audience, slug } });

  await recordAudit(actor, {
    action: "DELETE",
    module: PERMISSIONS.helpGuides,
    recordId: `${audience}:${slug}`,
    recordLabel: `${definition.title} (back to built in text)`,
    before: before && snapshot(before),
  });
  refresh(audience);
  return defaultGuide(definition);
}

/** What the change log keeps of a guide. */
function snapshot(guide: Guide) {
  return {
    title: guide.title,
    summary: guide.summary,
    recordingUrl: guide.recordingUrl,
    sections: guide.sections,
  };
}
