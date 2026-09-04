import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RichTextDoc, RichTextNode } from "@/lib/policy-types";

export function RichText({
  doc,
  className,
}: {
  doc: RichTextDoc;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      <Nodes nodes={doc.content} />
    </div>
  );
}

function Nodes({ nodes }: { nodes: RichTextNode[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <Node key={index} node={node} />
      ))}
    </>
  );
}

function Node({ node }: { node: RichTextNode }): ReactNode {
  switch (node.type) {
    case "text":
      return <Text node={node} />;

    case "hardBreak":
      return <br />;

    case "paragraph":
      return (
        <p className="text-base leading-relaxed text-ink-secondary">
          {node.content ? <Nodes nodes={node.content} /> : null}
        </p>
      );

    case "heading":
      return node.attrs.level === 2 ? (
        <h3 className="pt-2 font-sans text-lg font-normal leading-snug tracking-[-0.015em] text-ink">
          {node.content ? <Nodes nodes={node.content} /> : null}
        </h3>
      ) : (
        <h4 className="pt-1 font-sans text-base font-medium leading-snug text-ink">
          {node.content ? <Nodes nodes={node.content} /> : null}
        </h4>
      );

    case "bulletList":
      return (
        <ul className="space-y-2 pl-5 marker:text-ink-faint [list-style:disc]">
          {node.content ? <Nodes nodes={node.content} /> : null}
        </ul>
      );

    case "orderedList":
      return (
        <ol
          start={node.attrs?.start}
          className="space-y-2 pl-5 marker:font-mono marker:text-sm marker:text-ink-faint [list-style:decimal]"
        >
          {node.content ? <Nodes nodes={node.content} /> : null}
        </ol>
      );

    case "listItem":
      return (
        <li className="text-base leading-relaxed text-ink-secondary [&>p]:text-inherit">
          {node.content ? <Nodes nodes={node.content} /> : null}
        </li>
      );

    default:
      return null;
  }
}

function Text({ node }: { node: Extract<RichTextNode, { type: "text" }> }) {
  let content: ReactNode = node.text;

  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") {
      content = <strong className="font-medium text-ink">{content}</strong>;
    } else if (mark.type === "italic") {
      content = <em>{content}</em>;
    }
  }

  const link = node.marks?.find((mark) => mark.type === "link");
  if (!link || link.type !== "link") return <Fragment>{content}</Fragment>;

  const { href } = link.attrs;
  const internal = href.startsWith("/") || href.startsWith("#");

  const className =
    "text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-(--duration-fast) hover:text-accent";

  return internal ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
    >
      {content}
    </a>
  );
}
