import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPolicy } from "@/lib/policies";
import { pageMetadata, policySeo } from "@/lib/seo";
import type { PolicySlug } from "@/lib/policy-types";
import { PolicyDocument } from "./policy-document";

export async function policyMetadata(slug: PolicySlug): Promise<Metadata> {
  const policy = await getPublishedPolicy(slug);

  if (!policy) return { title: "Not found" };

  return pageMetadata(policySeo(policy));
}

export async function PolicyPage({ slug }: { slug: PolicySlug }) {
  const policy = await getPublishedPolicy(slug);

  if (!policy) notFound();

  return <PolicyDocument policy={policy} />;
}
