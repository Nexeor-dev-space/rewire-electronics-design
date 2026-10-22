"use client";

import { Dialog, DialogBody } from "@/components/ui/dialog";
import {
  ADDABLE_SECTION_TYPES,
  MAX_HOMEPAGE_SECTIONS,
  SECTION_RULES,
  type AddableSectionType,
} from "@/lib/homepage-sections";
import { cn } from "@/lib/utils";
import type { HomepageSection } from "@/types/homepage";
import { SectionTone } from "./section-tone";

/** Every type staff can add, each with what it is and, when it can't be added, why. */
export function AddSectionDialog({
  open,
  sections,
  onClose,
  onPick,
}: {
  open: boolean;
  sections: HomepageSection[];
  onClose: () => void;
  onPick: (type: AddableSectionType) => void;
}) {
  const full = sections.length >= MAX_HOMEPAGE_SECTIONS;

  function blockedReason(type: AddableSectionType): string | null {
    if (full) return `The homepage holds at most ${MAX_HOMEPAGE_SECTIONS} sections.`;
    if (SECTION_RULES[type].singleton && sections.some((section) => section.type === type)) {
      return "Already on the page. Edit it from the list instead.";
    }
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a section"
      description="It joins the end of the draft. Drag it into place, then publish."
    >
      <DialogBody>
        <ul className="grid gap-2">
          {ADDABLE_SECTION_TYPES.map((type, index) => {
            const reason = blockedReason(type);
            return (
              <li key={type}>
                <button
                  type="button"
                  disabled={reason !== null}
                  data-autofocus={index === 0 ? true : undefined}
                  onClick={() => onPick(type)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border border-line px-4 py-3 text-left",
                    "transition-colors duration-(--duration-fast) ease-(--ease-out-quart)",
                    "hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ink",
                    "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent",
                  )}
                >
                  <SectionTone type={type} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {SECTION_RULES[type].label}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-secondary">
                      {reason ?? SECTION_RULES[type].description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogBody>
    </Dialog>
  );
}
