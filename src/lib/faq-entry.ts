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

/** The FAQ policy's title split on its last space, to set over two lines. */
export function faqHeading(title: string): [string, string] {
  const trimmed = title.trim();
  const split = trimmed.lastIndexOf(" ");
  return split === -1 ? [trimmed, ""] : [trimmed.slice(0, split), trimmed.slice(split + 1)];
}
