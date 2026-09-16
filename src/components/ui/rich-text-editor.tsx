"use client";

import { useCallback, useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import type { RichTextDoc } from "@/lib/policy-types";
import { cn } from "@/lib/utils";

const HEADING_LEVELS = [2, 3] as const;

export interface RichTextEditorProps {
  value: RichTextDoc;
  onChange: (value: RichTextDoc) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  ariaLabel,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [...HEADING_LEVELS] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class: cn(
          "min-h-40 w-full rounded-b-md bg-surface px-4 py-3.5",
          "text-sm leading-relaxed text-ink focus:outline-none",
          "[&_p]:mb-3 [&_p:last-child]:mb-0",
          "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-ink",
          "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-ink",
          "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_li]:mb-1",
          "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2",
        ),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getJSON() as RichTextDoc);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(value)) return;

    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-[13.5rem] w-full rounded-md border border-line bg-surface",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-md border border-line",
        "transition-[border-color] duration-(--duration-fast)",
        "focus-within:border-accent hover:border-line-strong",
        className,
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const current = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("Link URL", current ?? "https://");

    if (input === null) return;

    const href = input.trim();

    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href })
      .run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface-2 px-2 py-1.5">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-semibold">B</span>
      </ToolbarButton>

      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="font-serif italic">I</span>
      </ToolbarButton>

      <Divider />

      {HEADING_LEVELS.map((level) => (
        <ToolbarButton
          key={level}
          label={`Heading ${level}`}
          active={editor.isActive("heading", { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
        >
          H{level}
        </ToolbarButton>
      ))}

      <Divider />

      <ToolbarButton
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        &bull;&#8202;&#8212;
      </ToolbarButton>

      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.&#8202;&#8212;
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        Link
      </ToolbarButton>

      <ToolbarButton
        label="Remove link"
        disabled={!editor.isActive("link")}
        onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
      >
        Unlink
      </ToolbarButton>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-line" />;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "grid h-8 min-w-8 place-items-center rounded px-2 text-xs",
        "transition-colors duration-(--duration-fast)",
        "text-ink-secondary hover:bg-surface hover:text-ink",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "bg-surface text-ink",
      )}
    >
      {children}
    </button>
  );
}
