"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { Reorder } from "framer-motion";
import { useRouter } from "next/navigation";
import { savePolicy, type PolicyInput } from "@/app/admin/storefront/content/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMPTY_RICH_TEXT, type PolicyData, type RichTextDoc } from "@/lib/policy-types";
import { cn } from "@/lib/utils";
import { PolicyBlockRow, type DraftBlock } from "./policy-block-row";

let draftKeySeed = 0;
function nextDraftKey(): string {
  draftKeySeed += 1;
  return `new-${draftKeySeed}`;
}

function toDraft(policy: PolicyData): {
  title: string;
  lede: string;
  draft: boolean;
  published: boolean;
  blocks: DraftBlock[];
} {
  return {
    title: policy.title,
    lede: policy.lede,
    draft: policy.draft,
    published: policy.published,
    blocks: policy.blocks.map((block) => ({
      key: block.id,
      id: block.id,
      title: block.title,
      content: block.content,
    })),
  };
}

type Draft = ReturnType<typeof toDraft>;

export function PolicyEditor({ policy }: { policy: PolicyData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [saved, setSaved] = useState<Draft>(() => toDraft(policy));
  const [draft, setDraft] = useState<Draft>(saved);

  const [status, setStatus] = useState<{ tone: "live" | "danger"; message: string } | null>(null);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  const statusTimer = useRef<number | undefined>(undefined);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  const confirming = draft.blocks.find((block) => block.key === confirmingKey);

  const setBlocks = useCallback(
    (next: DraftBlock[]) => setDraft((current) => ({ ...current, blocks: next })),
    [],
  );

  const updateBlock = useCallback(
    (key: string, patch: { title?: string; content?: RichTextDoc }) =>
      setDraft((current) => ({
        ...current,
        blocks: current.blocks.map((block) =>
          block.key === key ? { ...block, ...patch } : block,
        ),
      })),
    [],
  );

  const addBlock = useCallback(() => {
    setDraft((current) => ({
      ...current,
      blocks: [
        ...current.blocks,
        { key: nextDraftKey(), id: null, title: "", content: EMPTY_RICH_TEXT },
      ],
    }));
  }, []);

  const removeBlock = useCallback((key: string) => {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.key !== key),
    }));
    setConfirmingKey(null);
  }, []);

  function flashStatus(tone: "live" | "danger", message: string) {
    window.clearTimeout(statusTimer.current);
    setStatus({ tone, message });

    if (tone === "live") {
      statusTimer.current = window.setTimeout(() => setStatus(null), 2600);
    }
  }

  function handleSave() {
    const input: PolicyInput = {
      title: draft.title,
      lede: draft.lede,
      draft: draft.draft,
      published: draft.published,
      blocks: draft.blocks.map((block) => ({
        id: block.id,
        title: block.title,
        content: block.content,
      })),
    };

    startTransition(async () => {
      const result = await savePolicy(policy.slug, input);

      if (!result.ok) {
        flashStatus("danger", result.error);
        return;
      }

      const persisted = toDraft(result.policy);
      setSaved(persisted);
      setDraft(persisted);
      flashStatus("live", "Saved");

      router.refresh();
    });
  }

  function handleCancel() {
    setDraft(saved);
    setStatus(null);
  }

  return (
    <div className="pb-28">
      <section className="rounded-xl border border-line p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-2 lg:col-span-4">
            <Label htmlFor="policy-title">Main title</Label>
            <Input
              id="policy-title"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
            <p className="text-xs text-ink-muted">
              The page heading. The URL is fixed by the slug{" "}
              <span className="font-mono text-ink-secondary">{policy.slug}</span>{" "}
              and does not change with it.
            </p>
          </div>

          <div className="space-y-2 lg:col-span-8">
            <Label htmlFor="policy-lede">Introductory sub-text</Label>
            <Textarea
              id="policy-lede"
              value={draft.lede}
              rows={3}
              className="min-h-24"
              onChange={(event) =>
                setDraft((current) => ({ ...current, lede: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-6 border-t border-line pt-5">
          <ToggleField
            id="policy-published"
            label="Published"
            hint="Unpublished policies return 404 on the storefront."
            checked={draft.published}
            onChange={(published) => setDraft((current) => ({ ...current, published }))}
          />
          <ToggleField
            id="policy-draft"
            label="Show draft notice"
            hint="Tells readers the text has not been through legal review."
            checked={draft.draft}
            onChange={(value) => setDraft((current) => ({ ...current, draft: value }))}
          />
        </div>
      </section>

      <div className="mt-8 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-medium text-ink">
          Content blocks
          <span className="ml-2 font-mono text-xs text-ink-muted">
            {draft.blocks.length}
          </span>
        </h2>
      </div>

      {draft.blocks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-surface-2 px-6 py-12 text-center">
          <p className="text-sm text-ink-secondary">
            This policy has no sections. Add one to give the page content.
          </p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={draft.blocks}
          onReorder={setBlocks}
          className="mt-4 space-y-4"
        >
          {draft.blocks.map((block, index) => (
            <PolicyBlockRow
              key={block.key}
              block={block}
              index={index}
              onChange={updateBlock}
              onRequestDelete={() => setConfirmingKey(block.key)}
            />
          ))}
        </Reorder.Group>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addBlock}
        className="mt-5"
      >
        + Add Section
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-end gap-3 px-4 py-3 md:px-8 lg:pl-80">
          <p
            aria-live="polite"
            className={cn(
              "mr-auto min-h-5 font-mono text-[0.6875rem] uppercase tracking-[0.16em]",
              status?.tone === "danger" ? "text-danger" : "text-live",
            )}
          >
            {status?.message ??
              (dirty ? <span className="text-ink-muted">Unsaved changes</span> : "")}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={!dirty || pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            loading={pending}
            disabled={!dirty}
          >
            Save changes
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirming !== undefined}
        title="Delete this section?"
        description={
          <>
            <span className="text-ink">
              {confirming?.title.trim() || "This untitled section"}
            </span>{" "}
            and its content will be removed from the storefront when you save.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete section"
        onConfirm={() => confirmingKey && removeBlock(confirmingKey)}
        onCancel={() => setConfirmingKey(null)}
      />
    </div>
  );
}

function ToggleField({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-(--color-accent)"
      />
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </label>
    </div>
  );
}
