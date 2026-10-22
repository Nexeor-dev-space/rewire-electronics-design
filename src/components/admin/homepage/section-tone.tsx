import type { CSSProperties } from "react";
import { SECTION_RULES, type HomepageSectionType } from "@/lib/homepage-sections";
import { cn } from "@/lib/utils";

/** The section type's colour as `--tone`, for `border-(--tone)` and friends. */
export function toneStyle(type: HomepageSectionType): CSSProperties {
  return { "--tone": `var(--section-tone-${SECTION_RULES[type].tone})` } as CSSProperties;
}

/** A tinted square with a dot in the section type's colour. */
export function SectionTone({ type, className }: { type: HomepageSectionType; className?: string }) {
  return (
    <span
      aria-hidden
      style={toneStyle(type)}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
        "border border-(--tone)/25 bg-(--tone)/10",
        className,
      )}
    >
      <span className="size-2.5 rounded-full bg-(--tone)" />
    </span>
  );
}
