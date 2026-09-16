import type {
  RichTextDoc,
  RichTextMark,
  RichTextNode,
} from "./policy-types";
import { EMPTY_RICH_TEXT } from "./policy-types";

const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();

  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;

  try {
    return ALLOWED_PROTOCOLS.includes(new URL(trimmed).protocol);
  } catch {
    return false;
  }
}

function validateMarks(input: unknown): RichTextMark[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const marks: RichTextMark[] = [];

  for (const mark of input) {
    if (typeof mark !== "object" || mark === null) continue;
    const { type, attrs } = mark as { type?: unknown; attrs?: unknown };

    if (type === "bold" || type === "italic") {
      marks.push({ type });
      continue;
    }

    if (type === "link") {
      const href =
        typeof attrs === "object" && attrs !== null
          ? (attrs as { href?: unknown }).href
          : undefined;

      if (typeof href === "string" && isSafeHref(href)) {
        marks.push({ type: "link", attrs: { href: href.trim() } });
      }
    }
  }

  return marks.length > 0 ? marks : undefined;
}

function validateNodes(input: unknown): RichTextNode[] {
  if (!Array.isArray(input)) return [];

  const nodes: RichTextNode[] = [];

  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) continue;
    const node = raw as {
      type?: unknown;
      text?: unknown;
      attrs?: unknown;
      content?: unknown;
      marks?: unknown;
    };

    switch (node.type) {
      case "text": {
        if (typeof node.text !== "string" || node.text.length === 0) break;
        const marks = validateMarks(node.marks);
        nodes.push(marks ? { type: "text", text: node.text, marks } : { type: "text", text: node.text });
        break;
      }

      case "hardBreak":
        nodes.push({ type: "hardBreak" });
        break;

      case "paragraph":
        nodes.push({ type: "paragraph", content: validateNodes(node.content) });
        break;

      case "heading": {
        const level =
          typeof node.attrs === "object" && node.attrs !== null
            ? (node.attrs as { level?: unknown }).level
            : undefined;
        const safeLevel: 2 | 3 = level === 2 ? 2 : 3;
        nodes.push({
          type: "heading",
          attrs: { level: safeLevel },
          content: validateNodes(node.content),
        });
        break;
      }

      case "bulletList":
        nodes.push({ type: "bulletList", content: validateNodes(node.content) });
        break;

      case "orderedList": {
        const start =
          typeof node.attrs === "object" && node.attrs !== null
            ? (node.attrs as { start?: unknown }).start
            : undefined;
        nodes.push({
          type: "orderedList",
          attrs: typeof start === "number" ? { start } : undefined,
          content: validateNodes(node.content),
        });
        break;
      }

      case "listItem":
        nodes.push({ type: "listItem", content: validateNodes(node.content) });
        break;

      default:
        break;
    }
  }

  return nodes;
}

export function validateRichText(input: unknown): RichTextDoc {
  if (typeof input !== "object" || input === null) return EMPTY_RICH_TEXT;

  const doc = input as { type?: unknown; content?: unknown };
  if (doc.type !== "doc") return EMPTY_RICH_TEXT;

  const content = validateNodes(doc.content);

  return content.length > 0 ? { type: "doc", content } : EMPTY_RICH_TEXT;
}

export function richTextToPlainText(doc: RichTextDoc | RichTextNode[]): string {
  const nodes = Array.isArray(doc) ? doc : doc.content;

  const isInline = (node: RichTextNode) =>
    node.type === "text" || node.type === "hardBreak";

  const walk = (list: RichTextNode[]): string => {
    const parts = list.map((node) => {
      if (node.type === "text") return node.text;
      if (node.type === "hardBreak") return " ";
      return "content" in node && node.content ? walk(node.content) : "";
    });

    return list.every(isInline)
      ? parts.join("")
      : parts.filter(Boolean).join(" ");
  };

  return walk(nodes).replace(/\s+/g, " ").trim();
}

export function isRichTextEmpty(doc: RichTextDoc): boolean {
  return richTextToPlainText(doc).length === 0;
}

export function paragraphsToRichText(paragraphs: string[]): RichTextDoc {
  const content: RichTextNode[] = paragraphs
    .filter((text) => text.trim().length > 0)
    .map((text) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text }],
    }));

  return content.length > 0 ? { type: "doc", content } : EMPTY_RICH_TEXT;
}

export function paragraphsAndBulletsToRichText(
  paragraphs: string[],
  bullets: string[],
): RichTextDoc {
  const doc = paragraphsToRichText(paragraphs);
  const items = bullets.filter((text) => text.trim().length > 0);

  if (items.length === 0) return doc;

  return {
    type: "doc",
    content: [
      ...doc.content,
      {
        type: "bulletList",
        content: items.map((text) => ({
          type: "listItem" as const,
          content: [
            { type: "paragraph" as const, content: [{ type: "text" as const, text }] },
          ],
        })),
      },
    ],
  };
}
