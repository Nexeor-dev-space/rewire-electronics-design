"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useModuleAccess } from "@/components/admin/admin-access";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useDeleteHomepageSection,
  useDiscardHomepageDraft,
  useGetHomepageDraft,
  usePublishHomepage,
  useReorderHomepageSections,
  useUpdateHomepageSection,
} from "@/hooks/use-homepage";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FAQ_EDITOR_PATH, HOMEPAGE_PREVIEW_PATH } from "@/lib/constants";
import {
  firstLine,
  moveItem,
  rowErrorMessage,
  sectionToInput,
  storefrontWarning,
  swapItems,
} from "@/lib/homepage-builder";
import {
  SECTION_RULES,
  isAddableSectionType,
  isWithinSchedule,
  type AddableSectionType,
} from "@/lib/homepage-sections";
import { cn } from "@/lib/utils";
import type { HomepageDraft, HomepageSection } from "@/types/homepage";
import { AddSectionDialog } from "./add-section-dialog";
import { SectionFormModal } from "./section-form-modal";
import { SectionTone, toneStyle } from "./section-tone";

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
export function HomepageBuilder({ openType }: { openType?: AddableSectionType }) {
  const access = useModuleAccess(PERMISSIONS.homepage);
  const draft = useGetHomepageDraft();
  const updateSection = useUpdateHomepageSection();
  const deleteSection = useDeleteHomepageSection();
  const reorder = useReorderHomepageSections();
  const publish = usePublishHomepage();
  const discard = useDiscardHomepageDraft();

  const [modal, setModal] = useState<Modal>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (openType && !opened && draft.data) {
    setOpened(true);
    const existing = draft.data.sections.find((section) => section.type === openType);
    if (existing && access.edit) openModal({ kind: "edit", section: existing });
    else if (!existing && access.create) openModal({ kind: "add", type: openType });
  }

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
  function saveOrder(ids: string[]) {
    setActionError(null);
    reorder.mutate(ids, { onError: (error) => setActionError(rowErrorMessage(error)) });
  }

  function move(sections: HomepageSection[], index: number, offset: -1 | 1) {
    saveOrder(swapItems(sections.map((section) => section.id), index, offset));
  }

  function drop(sections: HomepageSection[], index: number) {
    if (dragIndex !== null && dragIndex !== index) {
      saveOrder(moveItem(sections.map((section) => section.id), dragIndex, index));
    }
    endDrag();
  }

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
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
    const canDrag = access.edit && !busy;
    content = (
      <ol className="overflow-hidden rounded-xl border border-line">
        {sections.map((section, index) => (
          <li
            key={section.id}
            draggable={canDrag}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", section.id);
              setDragIndex(index);
            }}
            onDragOver={(event) => {
              if (dragIndex === null) return;
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              drop(sections, index);
            }}
            onDragEnd={endDrag}
            className={cn(
              "border-b border-line last:border-b-0",
              dragIndex === index && "opacity-50",
              overIndex === index && dragIndex !== index && "bg-surface-2",
            )}
          >
            <SectionRow
              section={section}
              position={index + 1}
              draggable={canDrag}
              disabled={busy}
              first={index === 0}
              last={index === sections.length - 1}
              onToggle={() => toggleVisible(section)}
              onMoveUp={() => move(sections, index, -1)}
              onMoveDown={() => move(sections, index, 1)}
              onEdit={access.edit ? () => openModal({ kind: "edit", section }) : undefined}
              onDelete={
                access.delete && isAddableSectionType(section.type)
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
            {access.publish && (
              <>
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
              </>
            )}
          </div>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">
          Drag a row, or use its arrows, to change the order.
        </p>
        {access.create && (
          <Button size="sm" disabled={!data} onClick={() => setAdding(true)}>
            Add section
          </Button>
        )}
      </div>

      {saved && data?.hasUnpublishedChanges && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3"
        >
          <p className="text-sm text-ink">Saved to the draft. Shoppers see it after you publish.</p>
          {access.publish && (
            <Button size="sm" onClick={() => setConfirm({ kind: "publish" })}>
              Publish now
            </Button>
          )}
        </div>
      )}

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
          <SectionFormModal
            section={modal.section}
            onClose={() => setModal(null)}
            onSaved={() => setSaved(true)}
          />
        ) : (
          <SectionFormModal
            type={modal.type}
            onClose={() => setModal(null)}
            onSaved={() => setSaved(true)}
          />
        ))}

      {data && (
        <AddSectionDialog
          open={adding}
          sections={data.sections}
          onClose={() => setAdding(false)}
          onPick={(type) => {
            setAdding(false);
            openModal({ kind: "add", type });
          }}
        />
      )}

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
  position,
  draggable,
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
  /** 1-based place on the page. */
  position: number;
  draggable: boolean;
  disabled: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** Absent without Edit: moving and show/hide lock too. */
  onEdit?: () => void;
  /** Only added section types can be deleted. */
  onDelete?: () => void;
}) {
  const label = SECTION_RULES[section.type].label;
  const locked = disabled || !onEdit;
  const warning = section.visible ? storefrontWarning(section) : null;
  const schedule = SECTION_RULES[section.type].schedule ? scheduleLabel(section) : null;
  return (
    <div
      style={toneStyle(section.type)}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-l-4 border-(--tone) px-4 py-3.5"
    >
      <span
        aria-hidden
        className={cn("text-ink-muted", draggable ? "cursor-grab active:cursor-grabbing" : "opacity-40")}
      >
        <GripIcon />
      </span>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-xs text-ink-secondary">
        {position}
      </span>
      <SectionTone type={section.type} className={cn(!section.visible && "opacity-50")} />

      <div className={cn("min-w-0 flex-1", !section.visible && "opacity-60")}>
        <p className="eyebrow">{label}</p>
        <p className="mt-0.5 truncate text-sm text-ink">{firstLine(section.title) || "Untitled"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {section.seasonal && (
          <Badge variant="outline" className={BADGE_CLASS}>
            Seasonal
          </Badge>
        )}
        {warning && (
          <Badge variant="warn" className={BADGE_CLASS}>
            {warning}
          </Badge>
        )}
        {schedule && (
          <Badge variant={schedule === "Running" ? "outline" : "warn"} className={BADGE_CLASS}>
            {schedule}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 text-right text-sm text-ink-secondary">
          {section.visible ? "Visible" : "Hidden"}
        </span>
        <Switch
          checked={section.visible}
          disabled={locked}
          onChange={onToggle}
          label={`Show ${label} on the homepage`}
        />
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={locked || first}
          onClick={onMoveUp}
          aria-label={`Move ${label} up`}
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={locked || last}
          onClick={onMoveDown}
          aria-label={`Move ${label} down`}
        >
          ↓
        </Button>
      </div>

      {onDelete ? (
        <RowActions name={label} disabled={disabled} onEdit={onEdit} onDelete={onDelete} />
      ) : (
        onEdit && (
          <Button variant="outline" size="sm" disabled={disabled} onClick={onEdit} aria-label={`Edit ${label}`}>
            Edit
          </Button>
        )
      )}
    </div>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      {[9, 15].flatMap((x) =>
        [6, 12, 18].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.5} />),
      )}
    </svg>
  );
}

function scheduleLabel({ startsAt, endsAt }: HomepageSection): string {
  if (!startsAt || !endsAt) return "No dates";
  const now = new Date();
  if (isWithinSchedule(new Date(startsAt), new Date(endsAt), now)) return "Running";
  return now < new Date(startsAt) ? "Scheduled" : "Ended";
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
