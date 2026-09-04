"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { POLICIES_TAG, policyTag, readPolicy } from "@/lib/policies";
import { validateRichText } from "@/lib/rich-text";
import {
  POLICY_ROUTES,
  isPolicySlug,
  uniqueAnchor,
  type PolicyData,
  type PolicySlug,
  type RichTextDoc,
} from "@/lib/policy-types";

export interface PolicyBlockInput {
  id: string | null;
  title: string;
  content: RichTextDoc;
}

export interface PolicyInput {
  title: string;
  lede: string;
  draft: boolean;
  published: boolean;
  blocks: PolicyBlockInput[];
}

export type ActionResult =
  | { ok: true; policy: PolicyData }
  | { ok: false; error: string };

const asJson = (doc: RichTextDoc) => doc as unknown as Prisma.InputJsonValue;

export async function savePolicy(
  slug: string,
  input: PolicyInput,
): Promise<ActionResult> {
  if (!isPolicySlug(slug)) {
    return { ok: false, error: "Unknown policy." };
  }

  const title = input.title.trim();
  const lede = input.lede.trim();

  if (!title) return { ok: false, error: "The policy needs a title." };
  if (!lede) return { ok: false, error: "The policy needs introductory sub-text." };

  const blocks = input.blocks.map((block) => ({
    id: block.id,
    title: block.title.trim(),
    content: validateRichText(block.content),
  }));

  const untitled = blocks.findIndex((block) => block.title.length === 0);
  if (untitled !== -1) {
    return { ok: false, error: `Section ${untitled + 1} needs a title.` };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const policy = await tx.policy.findUnique({
          where: { slug },
          select: { id: true, blocks: { select: { id: true, anchor: true } } },
        });

        if (!policy) throw new Error("Policy not found.");

        await tx.policy.update({
          where: { id: policy.id },
          data: { title, lede, draft: input.draft, published: input.published },
        });

        const owned = new Map(
          policy.blocks.map((block) => [block.id, block.anchor]),
        );

        const submitted = new Set(
          blocks
            .map((block) => block.id)
            .filter((id): id is string => id !== null && owned.has(id)),
        );

        const removed = [...owned.keys()].filter((id) => !submitted.has(id));

        if (removed.length > 0) {
          await tx.policyBlock.deleteMany({
            where: { id: { in: removed }, policyId: policy.id },
          });
        }

        const taken = new Set(
          [...submitted].map((id) => owned.get(id) as string),
        );

        for (const [index, block] of blocks.entries()) {
          if (block.id && submitted.has(block.id)) {
            await tx.policyBlock.update({
              where: { id: block.id, policyId: policy.id },
              data: {
                title: block.title,
                content: asJson(block.content),
                sortOrder: index,
              },
            });
            continue;
          }

          const anchor = uniqueAnchor(block.title, taken);
          taken.add(anchor);

          await tx.policyBlock.create({
            data: {
              policyId: policy.id,
              anchor,
              title: block.title,
              content: asJson(block.content),
              sortOrder: index,
            },
          });
        }
      },
      { timeout: 15000 },
    );
  } catch (error) {
    console.error(`savePolicy(${slug}) failed`, error);
    return { ok: false, error: "Could not save. The change was not applied." };
  }

  const saved = await readPolicy(slug);

  if (!saved) {
    return { ok: false, error: "Saved, but the policy could not be read back." };
  }

  revalidatePolicy(slug);

  return { ok: true, policy: saved };
}

function revalidatePolicy(slug: PolicySlug) {
  revalidateTag(policyTag(slug));
  revalidateTag(POLICIES_TAG);
  revalidatePath(POLICY_ROUTES[slug]);
  if (slug === "faq") revalidatePath("/");
}
