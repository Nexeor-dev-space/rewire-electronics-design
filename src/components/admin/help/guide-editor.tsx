"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageField } from "@/components/admin/shared/image-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { ApiError } from "@/lib/api/api-client";
import { useResetHelpGuide, useSaveHelpGuide } from "@/hooks/use-help-guide";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import {
  HELP_GUIDE_NOTES_LIMIT,
  HELP_GUIDE_SECTIONS_LIMIT,
  HELP_GUIDE_STEPS_LIMIT,
  HELP_GUIDE_SUMMARY_MAX_LENGTH,
  HELP_GUIDE_TEXT_MAX_LENGTH,
  HELP_GUIDE_TITLE_MAX_LENGTH,
} from "@/lib/constants";
import type { Guide, GuideSection, GuideStep } from "@/lib/user-guides/types";

/**
 * Edits one guide: title, summary, recording link, then each section's intro,
 * steps (each with a screenshot) and notes. Saving writes the whole guide, and
 * Reset removes the edits so the built in text shows again.
 */

const NEW_SECTION_TITLE = "New section";

function moved<T>(list: T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target] as T, next[index] as T];
  return next;
}

const without = <T,>(list: T[], index: number) => list.filter((_, at) => at !== index);

const replaced = <T,>(list: T[], index: number, value: T) => list.map((item, at) => (at === index ? value : item));

function nextSectionId(sections: GuideSection[]): string {
  const taken = new Set(sections.map((section) => section.id));
  let n = sections.length + 1;
  while (taken.has(`section-${n}`)) n += 1;
  return `section-${n}`;
}

function RowButtons({
  onUp,
  onDown,
  onRemove,
  label,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button type="button" variant="ghost" size="sm" aria-label={`Move ${label} up`} onClick={onUp}>
        Up
      </Button>
      <Button type="button" variant="ghost" size="sm" aria-label={`Move ${label} down`} onClick={onDown}>
        Down
      </Button>
      <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${label}`} onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

function StepRow({
  index,
  step,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  step: GuideStep;
  onChange: (step: GuideStep) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="eyebrow">Step {index + 1}</span>
        <RowButtons
          label={`step ${index + 1}`}
          onUp={() => onMove(-1)}
          onDown={() => onMove(1)}
          onRemove={onRemove}
        />
      </div>
      <Textarea
        aria-label={`Step ${index + 1} text`}
        rows={2}
        maxLength={HELP_GUIDE_TEXT_MAX_LENGTH}
        value={step.text}
        onChange={(event) => onChange({ ...step, text: event.target.value })}
        className="py-3"
      />
      <ImageField
        label="Screenshot"
        value={step.imageId}
        previewUrl={step.imageId ? API_ENDPOINTS.media.detail(step.imageId) : (step.imageUrl ?? null)}
        onChange={(imageId) => onChange({ ...step, imageId, imageUrl: null })}
      />
    </li>
  );
}

function SectionCard({
  index,
  section,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  section: GuideSection;
  onChange: (section: GuideSection) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const idBase = `section-${index}`;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">Section {index + 1}</h2>
        <RowButtons label={`section ${index + 1}`} onUp={() => onMove(-1)} onDown={() => onMove(1)} onRemove={onRemove} />
      </div>

      <Field id={`${idBase}-title`} label="Section title">
        <Input
          id={`${idBase}-title`}
          maxLength={HELP_GUIDE_TITLE_MAX_LENGTH}
          value={section.title}
          onChange={(event) => onChange({ ...section, title: event.target.value })}
        />
      </Field>

      <Field id={`${idBase}-intro`} label="Intro (optional)">
        <Textarea
          id={`${idBase}-intro`}
          rows={2}
          maxLength={HELP_GUIDE_TEXT_MAX_LENGTH}
          value={section.intro ?? ""}
          onChange={(event) => onChange({ ...section, intro: event.target.value })}
          className="py-3"
        />
      </Field>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-ink">Steps</p>
        {section.steps.length > 0 && (
          <ol className="flex flex-col gap-3">
            {section.steps.map((step, stepIndex) => (
              <StepRow
                key={stepIndex}
                index={stepIndex}
                step={step}
                onChange={(next) => onChange({ ...section, steps: replaced(section.steps, stepIndex, next) })}
                onMove={(by) => onChange({ ...section, steps: moved(section.steps, stepIndex, by) })}
                onRemove={() => onChange({ ...section, steps: without(section.steps, stepIndex) })}
              />
            ))}
          </ol>
        )}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={section.steps.length >= HELP_GUIDE_STEPS_LIMIT}
            onClick={() => onChange({ ...section, steps: [...section.steps, { text: "", imageId: null }] })}
          >
            Add step
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-ink">Notes</p>
        {section.notes.map((note, noteIndex) => (
          <div key={noteIndex} className="flex flex-col items-end gap-2 sm:flex-row sm:items-start">
            <Textarea
              aria-label={`Note ${noteIndex + 1}`}
              rows={2}
              maxLength={HELP_GUIDE_TEXT_MAX_LENGTH}
              value={note}
              onChange={(event) => onChange({ ...section, notes: replaced(section.notes, noteIndex, event.target.value) })}
              className="py-3"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove note ${noteIndex + 1}`}
              onClick={() => onChange({ ...section, notes: without(section.notes, noteIndex) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={section.notes.length >= HELP_GUIDE_NOTES_LIMIT}
            onClick={() => onChange({ ...section, notes: [...section.notes, ""] })}
          >
            Add note
          </Button>
        </div>
      </div>
    </section>
  );
}

export function GuideEditor({ guide }: { guide: Guide }) {
  const save = useSaveHelpGuide();
  const reset = useResetHelpGuide();
  const [confirmReset, setConfirmReset] = useState(false);
  const [edited, setEdited] = useState(guide.edited);
  const [title, setTitle] = useState(guide.title);
  const [summary, setSummary] = useState(guide.summary);
  const [recordingUrl, setRecordingUrl] = useState(guide.recordingUrl ?? "");
  const [sections, setSections] = useState(guide.sections);

  const target = { audience: guide.audience, slug: guide.slug };
  const fieldErrors = save.error instanceof ApiError ? save.error.body.fields : undefined;

  function load(next: Guide) {
    setEdited(next.edited);
    setTitle(next.title);
    setSummary(next.summary);
    setRecordingUrl(next.recordingUrl ?? "");
    setSections(next.sections);
  }

  function handleSave() {
    save.mutate(
      {
        ...target,
        input: {
          title,
          summary,
          recordingUrl: recordingUrl.trim() || null,
          sections: sections.map((section) => ({ ...section, intro: section.intro?.trim() || undefined })),
        },
      },
      { onSuccess: (saved) => load(saved) },
    );
  }

  function handleReset() {
    reset.mutate(target, {
      onSuccess: (next) => {
        load(next);
        setConfirmReset(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface-2 p-5">
        <Field id="guide-title" label="Title" error={fieldErrors?.title?.[0]}>
          <Input
            id="guide-title"
            maxLength={HELP_GUIDE_TITLE_MAX_LENGTH}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field id="guide-summary" label="Summary" error={fieldErrors?.summary?.[0]}>
          <Textarea
            id="guide-summary"
            rows={2}
            maxLength={HELP_GUIDE_SUMMARY_MAX_LENGTH}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="py-3"
          />
        </Field>
        <Field
          id="guide-recording"
          label="Recording link (optional)"
          hint="An https link to a silent video file ending in .mp4 or .webm, under three minutes."
          error={fieldErrors?.recordingUrl?.[0]}
        >
          <Input
            id="guide-recording"
            type="url"
            value={recordingUrl}
            onChange={(event) => setRecordingUrl(event.target.value)}
          />
        </Field>
      </section>

      {sections.map((section, index) => (
        <SectionCard
          key={section.id}
          index={index}
          section={section}
          onChange={(next) => setSections(replaced(sections, index, next))}
          onMove={(by) => setSections(moved(sections, index, by))}
          onRemove={() => setSections(without(sections, index))}
        />
      ))}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={sections.length >= HELP_GUIDE_SECTIONS_LIMIT}
          onClick={() =>
            setSections([...sections, { id: nextSectionId(sections), title: NEW_SECTION_TITLE, steps: [], notes: [] }])
          }
        >
          Add section
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button type="button" loading={save.isPending} onClick={handleSave}>
          Save
        </Button>
        {edited && (
          <Button type="button" variant="ghost" onClick={() => setConfirmReset(true)}>
            Reset to built in text
          </Button>
        )}
        <Link href="/admin/storefront/help-guides" className={buttonVariants({ variant: "ghost" })}>
          Back to all guides
        </Link>
        {save.isSuccess && <p role="status" className="text-sm text-ink-secondary">Saved.</p>}
        {save.isError && (
          <p role="alert" className="text-sm text-danger">
            {save.error.message}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset this guide?"
        description="Your changes to this guide are removed and the built in text shows again."
        confirmLabel="Reset"
        loading={reset.isPending}
        error={reset.isError ? reset.error.message : undefined}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
