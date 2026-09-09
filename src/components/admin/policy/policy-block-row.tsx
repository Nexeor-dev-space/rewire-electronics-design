"use client";

import { useRef } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { RichTextDoc } from "@/lib/policy-types";

export interface DraftBlock {
  key: string;
  id: string | null;
  title: string;
  content: RichTextDoc;
}

interface Props {
  block: DraftBlock;
  index: number;
  onChange: (key: string, patch: { title?: string; content?: RichTextDoc }) => void;
  onRequestDelete: () => void;
}

export function PolicyBlockRow({ block, index, onChange, onRequestDelete }: Props) {
  const controls = useDragControls();
  const ref = useRef<HTMLLIElement>(null);

  const titleId = `block-title-${block.key}`;
  const position = String(index + 1).padStart(2, "0");

  return (
    <Reorder.Item
      ref={ref}
      value={block}
      dragListener={false}
      dragControls={controls}
      className="rounded-xl border border-line bg-surface-2 p-4 md:p-5"
    >
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          aria-label={`Reorder section ${index + 1}`}
          onPointerDown={(event) => controls.start(event)}
          className="cursor-grab touch-none rounded p-1 text-ink-muted transition-colors duration-(--duration-fast) hover:bg-surface hover:text-ink active:cursor-grabbing"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="size-4"
            aria-hidden
          >
            <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />
          </svg>
        </button>

        <span
          aria-hidden
          className="font-mono text-[0.6875rem] tabular-nums tracking-[0.2em] text-ink-faint"
        >
          {position}
        </span>

        <button
          type="button"
          onClick={onRequestDelete}
          className="ml-auto rounded px-2 py-1 text-xs text-ink-muted transition-colors duration-(--duration-fast) hover:bg-surface hover:text-danger"
        >
          Delete
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-2 lg:col-span-4">
          <Label htmlFor={titleId}>Section title</Label>
          <Input
            id={titleId}
            value={block.title}
            placeholder="Warranty coverage"
            onChange={(event) => onChange(block.key, { title: event.target.value })}
          />
        </div>

        <div className="space-y-2 lg:col-span-8">
          <Label htmlFor={`block-content-${block.key}`}>Section content</Label>
          <RichTextEditor
            value={block.content}
            ariaLabel={`Content for section ${index + 1}`}
            onChange={(content) => onChange(block.key, { content })}
          />
        </div>
      </div>
    </Reorder.Item>
  );
}
