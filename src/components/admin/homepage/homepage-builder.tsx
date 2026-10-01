"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteHomepageSection,
  useDiscardHomepageDraft,
  useGetHomepageDraft,
  usePublishHomepage,
  useReorderHomepageSections,
  useUpdateHomepageSection,
} from "@/hooks/use-homepage";
import { FAQ_EDITOR_PATH, HOMEPAGE_PREVIEW_PATH } from "@/lib/constants";
import { firstLine, rowErrorMessage, sectionToInput, swapItems } from "@/lib/homepage-builder";
import {
  ADDABLE_SECTION_TYPES,
  MAX_HOMEPAGE_SECTIONS,
  SECTION_RULES,
  isAddableSectionType,
  type AddableSectionType,
} from "@/lib/homepage-sections";
import { cn } from "@/lib/utils";
import type { HomepageDraft, HomepageSection } from "@/types/homepage";
import { SectionFormModal } from "./section-form-modal";

type Modal = { kind: "add"; type: AddableSectionType } | { kind: "edit"; section: HomepageSection } | null;
type Confirm =
  | { kind: "publish" }
  | { kind: "discard" }
  | { kind: "delete"; section: HomepageSection }
  | null;

const BADGE_CLASS = "px-2 py-1 text-[0.625rem]";

/**
 * The Homepage Builder: the draft's sections in order, with show/hide, move,
 * edit, add and delete, plus Preview, Discard draft and Publish. Every write
 * goes to the draft; shoppers see nothing until Publish. See
 * docs/HOMEPAGE-CMS.md.
 */
export function HomepageBuilder() {
  const draft = useGetHomepageDraft();
  const updateSection = useUpdateHomepageSection();
  const deleteSection = useDeleteHomepageSection();
  const reorder = useReorderHomepageSections();
  const publish = usePublishHomepage();
  const discard = useDiscardHomepageDraft();

  const [modal, setModal] = useState<Modal>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const busy = updateSection.isPending || reorder.isPending || deleteSection.isPending;

  function toggleVisible(section: HomepageSection) {
    setActionError(null);
    updateSection.mutate(
      { id: section.id, ...sectionToInput(section), visible: !section.visible },
      // e.g. a featured section whose brands were all deleted: the API asks
      // for at least one, and staff fix it in Edit.
      {
        onError: (error) =>
          setActionError(`${SECTION_RULES[section.type].label}: ${rowErrorMessage(error)}`),
      },
    );
  }

  /** A stale list (sections added or deleted elsewhere) is refused; the hook reloads it. */
  function move(sections: HomepageSection[], index: number, offset: -1 | 1) {
    setActionError(null);
    const ids = sections.map((section) => section.id);
    reorder.mutate(swapItems(ids, index, offset), {
      onError: (error) => setActionError(rowErrorMessage(error)),
    });
  }

  function openModal(next: NonNullable<Modal>) {
    setActionError(null);
    setModal(next);
  }

  const confirmMutation =
    confirm?.kind === "publish" ? publish : confirm?.kind === "discard" ? discard : deleteSection;

  function runConfirm() {
    if (!confirm) return;
    const onSuccess = () => {
      setConfirm(null);
      confirmMutation.reset();
    };
    if (confirm.kind === "publish") publish.mutate(undefined, { onSuccess });
    else if (confirm.kind === "discard") discard.mutate(undefined, { onSuccess });
    else deleteSection.mutate(confirm.section.id, { onSuccess });
  }

  function cancelConfirm() {
    setConfirm(null);
    confirmMutation.reset();
  }

  let content: ReactNode;
  if (draft.isPending) {
    content = <ListSkeleton />;
  } else if (draft.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{draft.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => draft.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (draft.data.sections.length === 0) {
    content = (
      <AdminEmptyState
        title="The homepage has no sections"
        description="Add a section, or discard the draft to return to what is published."
      />
    );
  } else {
    const { sections } = draft.data;
    content = (
      <ol className="overflow-hidden rounded-xl border border-line">
        {sections.map((section, index) => (
          <li key={section.id} className="border-b border-line last:border-b-0">
            <SectionRow
              section={section}
              disabled={busy}
              first={index === 0}
              last={index === sections.length - 1}
              onToggle={() => toggleVisible(section)}
              onMoveUp={() => move(sections, index, -1)}
              onMoveDown={() => move(sections, index, 1)}
              onEdit={() => openModal({ kind: "edit", section })}
              onDelete={
                isAddableSectionType(section.type)
                  ? () => setConfirm({ kind: "delete", section })
                  : undefined
              }
            />
          </li>
        ))}
      </ol>
    );
  }

  const data = draft.data;
  const full = (data?.sections.length ?? 0) >= MAX_HOMEPAGE_SECTIONS;

  return (
    <AdminPage
      title="Homepage Builder"
      description="The storefront homepage's sections, their order and their copy. Changes stay in a draft until you publish."
      actions={
        data && (
          <div className="flex flex-wrap items-center gap-2">
            <PublishStatus draft={data} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(HOMEPAGE_PREVIEW_PATH, "_blank", "noopener")}
            >
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.hasUnpublishedChanges || data.publishedAt === null}
              onClick={() => setConfirm({ kind: "discard" })}
            >
              Discard draft
            </Button>
            <Button
              size="sm"
              disabled={!data.hasUnpublishedChanges || data.sections.length === 0}
              onClick={() => setConfirm({ kind: "publish" })}
            >
              Publish
            </Button>
          </div>
        )
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1">Add section</span>
        {ADDABLE_SECTION_TYPES.map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            disabled={!data || full}
            onClick={() => openModal({ kind: "add", type })}
          >
            {SECTION_RULES[type].label}
          </Button>
        ))}
        {full && (
          <p className="text-xs text-ink-muted">
            The homepage holds at most {MAX_HOMEPAGE_SECTIONS} sections.
          </p>
        )}
      </div>

      {actionError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {actionError}
        </p>
      )}

      {content}

      <p className="mt-5 text-sm text-ink-secondary">
        The FAQ section&apos;s questions are edited in{" "}
        <Link href={FAQ_EDITOR_PATH} className="text-ink underline-offset-4 hover:underline">
          Content &amp; Policies
        </Link>
        .
      </p>

      {modal &&
        (modal.kind === "edit" ? (
          <SectionFormModal section={modal.section} onClose={() => setModal(null)} />
        ) : (
          <SectionFormModal type={modal.type} onClose={() => setModal(null)} />
        ))}

      <ConfirmDialog
        open={confirm !== null}
        title={confirmTitle(confirm)}
        description={confirmDescription(confirm)}
        confirmLabel={
          confirm?.kind === "publish"
            ? "Publish"
            : confirm?.kind === "discard"
              ? "Discard draft"
              : "Delete section"
        }
        error={confirmMutation.isError ? confirmMutation.error.message : undefined}
        loading={confirmMutation.isPending}
        onCancel={cancelConfirm}
        onConfirm={runConfirm}
      />
    </AdminPage>
  );
}

function confirmTitle(confirm: Confirm): string {
  if (confirm?.kind === "publish") return "Publish the homepage?";
  if (confirm?.kind === "discard") return "Discard the draft?";
  if (confirm?.kind === "delete") return `Delete this ${SECTION_RULES[confirm.section.type].label.toLowerCase()}?`;
  return "";
}

function confirmDescription(confirm: Confirm): string | undefined {
  if (confirm?.kind === "publish") return "Shoppers see the draft as it is now, straight away.";
  if (confirm?.kind === "discard") {
    return "Every change since the last publish is lost. The draft goes back to what shoppers see.";
  }
  if (confirm?.kind === "delete") {
    return "It leaves the draft now and the storefront at the next publish.";
  }
  return undefined;
}

function PublishStatus({ draft }: { draft: HomepageDraft }) {
  if (draft.hasUnpublishedChanges) {
    return (
      <Badge variant="warn" className={BADGE_CLASS}>
        Unpublished changes
      </Badge>
    );
  }
  if (!draft.publishedAt) return <Badge className={BADGE_CLASS}>Never published</Badge>;
  return (
    <Badge variant="live" className={BADGE_CLASS}>
      Published{" "}
      {new Date(draft.publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
    </Badge>
  );
}

function SectionRow({
  section,
  disabled,
  first,
  last,
  onToggle,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  section: HomepageSection;
  disabled: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  /** Only added section types can be deleted. */
  onDelete?: () => void;
}) {
  const label = SECTION_RULES[section.type].label;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4",
        !section.visible && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || first}
          onClick={onMoveUp}
          aria-label={`Move ${label} up`}
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || last}
          onClick={onMoveDown}
          aria-label={`Move ${label} down`}
        >
          ↓
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <p className="eyebrow">{label}</p>
        <p className="mt-0.5 truncate text-sm text-ink">{firstLine(section.title) || "Untitled"}</p>
      </div>

      <div className="flex items-center gap-2">
        {section.seasonal && (
          <Badge variant="outline" className={BADGE_CLASS}>
            Seasonal
          </Badge>
        )}
        {!section.visible && <Badge className={BADGE_CLASS}>Hidden</Badge>}
        <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" checked={section.visible} disabled={disabled} onChange={onToggle} />
          Visible
        </label>
      </div>

      {onDelete ? (
        <RowActions name={label} disabled={disabled} onEdit={onEdit} onDelete={onDelete} />
      ) : (
        <Button variant="outline" size="sm" disabled={disabled} onClick={onEdit} aria-label={`Edit ${label}`}>
          Edit
        </Button>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
        >
          <Skeleton className="h-8 w-8" />
          <div className="flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
