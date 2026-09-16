import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { validateRichText } from "./rich-text";
import {
  POLICY_SLUGS,
  isPolicySlug,
  type PolicyData,
  type PolicySlug,
  type PolicySummary,
} from "./policy-types";

export function policyTag(slug: PolicySlug): string {
  return `policy:${slug}`;
}

export const POLICIES_TAG = "policies";

function toPolicyData(row: {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  lede: string;
  draft: boolean;
  published: boolean;
  updatedAt: Date;
  blocks: {
    id: string;
    anchor: string;
    title: string;
    content: unknown;
  }[];
}): PolicyData | null {
  if (!isPolicySlug(row.slug)) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eyebrow: row.eyebrow,
    lede: row.lede,
    draft: row.draft,
    published: row.published,
    updatedAt: row.updatedAt.toISOString(),
    blocks: row.blocks.map((block) => ({
      id: block.id,
      anchor: block.anchor,
      title: block.title,
      content: validateRichText(block.content),
    })),
  };
}

export async function readPolicy(slug: PolicySlug): Promise<PolicyData | null> {
  const row = await prisma.policy.findUnique({
    where: { slug },
    include: { blocks: { orderBy: { sortOrder: "asc" } } },
  });

  return row ? toPolicyData(row) : null;
}

export function getPolicy(slug: PolicySlug): Promise<PolicyData | null> {
  return unstable_cache(() => readPolicy(slug), ["policy", slug], {
    tags: [policyTag(slug), POLICIES_TAG],
  })();
}

export async function getPublishedPolicy(
  slug: PolicySlug,
): Promise<PolicyData | null> {
  const policy = await getPolicy(slug);
  return policy?.published ? policy : null;
}

async function readPolicySummaries(): Promise<PolicySummary[]> {
  const rows = await prisma.policy.findMany({
    select: {
      slug: true,
      title: true,
      draft: true,
      published: true,
      updatedAt: true,
      _count: { select: { blocks: true } },
    },
  });

  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  return POLICY_SLUGS.flatMap((slug) => {
    const row = bySlug.get(slug);
    if (!row) return [];

    return [
      {
        slug,
        title: row.title,
        blockCount: row._count.blocks,
        draft: row.draft,
        published: row.published,
        updatedAt: row.updatedAt.toISOString(),
      },
    ];
  });
}

export function listPolicies(): Promise<PolicySummary[]> {
  return unstable_cache(readPolicySummaries, ["policies", "list"], {
    tags: [POLICIES_TAG],
  })();
}
