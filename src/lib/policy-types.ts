export const POLICY_SLUGS = [
  "warranty",
  "terms-and-conditions",
  "shipping",
  "faq",
  "privacy-policy",
  "returns-refunds-cancellation",
] as const;

export type PolicySlug = (typeof POLICY_SLUGS)[number];

export function isPolicySlug(value: string): value is PolicySlug {
  return (POLICY_SLUGS as readonly string[]).includes(value);
}

export const POLICY_ROUTES: Record<PolicySlug, string> = {
  warranty: "/warranty",
  "terms-and-conditions": "/terms",
  shipping: "/shipping",
  faq: "/faq",
  "privacy-policy": "/privacy",
  "returns-refunds-cancellation": "/returns-refunds-cancellation",
};

export const POLICY_NAV_LABELS: Record<PolicySlug, string> = {
  warranty: "Warranty",
  "terms-and-conditions": "Terms & Conditions",
  shipping: "Shipping",
  faq: "FAQ",
  "privacy-policy": "Privacy Policy",
  "returns-refunds-cancellation": "Returns, Refunds & Cancellation",
};

export function policyLink(slug: PolicySlug): { label: string; href: string } {
  return { label: POLICY_NAV_LABELS[slug], href: POLICY_ROUTES[slug] };
}

export type RichTextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string; target?: string | null } };

export type RichTextNode =
  | { type: "text"; text: string; marks?: RichTextMark[] }
  | { type: "hardBreak" }
  | { type: "paragraph"; content?: RichTextNode[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: RichTextNode[] }
  | { type: "bulletList"; content?: RichTextNode[] }
  | { type: "orderedList"; attrs?: { start?: number }; content?: RichTextNode[] }
  | { type: "listItem"; content?: RichTextNode[] };

export interface RichTextDoc {
  type: "doc";
  content: RichTextNode[];
}

export const EMPTY_RICH_TEXT: RichTextDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export interface PolicyBlockData {
  id: string;
  anchor: string;
  title: string;
  content: RichTextDoc;
}

export interface PolicyData {
  id: string;
  slug: PolicySlug;
  title: string;
  eyebrow: string;
  lede: string;
  draft: boolean;
  published: boolean;
  updatedAt: string;
  blocks: PolicyBlockData[];
}

export interface PolicySummary {
  slug: PolicySlug;
  title: string;
  blockCount: number;
  draft: boolean;
  published: boolean;
  updatedAt: string;
}

export function toAnchor(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "section";
}

export function uniqueAnchor(title: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = toAnchor(title);

  if (!used.has(base)) return base;

  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
