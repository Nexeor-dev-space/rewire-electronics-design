import type { PolicyData, RichTextDoc } from "./policy-types";

export interface FaqEntry {
  id: string;
  question: string;
  answer: RichTextDoc;
}

export function toFaqEntries(policy: PolicyData | null): FaqEntry[] {
  if (!policy) return [];

  return policy.blocks.map((block) => ({
    id: block.anchor,
    question: block.title,
    answer: block.content,
  }));
}
