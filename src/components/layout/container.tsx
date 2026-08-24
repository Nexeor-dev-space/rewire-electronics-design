import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Layout primitives — the editorial grid.
 * Container: max-width + fluid gutters.
 * Section: vertical rhythm between page chapters.
 */

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** `wide` for full-bleed editorial moments, `narrow` for prose. */
  width?: "default" | "wide" | "narrow";
}

export function Container({
  as: Component = "div",
  width = "default",
  className,
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-(--spacing-gutter)",
        width === "default" && "max-w-7xl",
        width === "wide" && "max-w-[110rem]",
        width === "narrow" && "max-w-3xl",
        className,
      )}
      {...props}
    />
  );
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** `sm` for tighter supporting sections. */
  spacing?: "default" | "sm";
}

export function Section({
  as: Component = "section",
  spacing = "default",
  className,
  ...props
}: SectionProps) {
  return (
    <Component
      className={cn(
        spacing === "default" ? "py-(--spacing-section)" : "py-(--spacing-section-sm)",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Editorial section header: eyebrow label only.
 *
 * The `index` prop is accepted for backwards compatibility with call
 * sites that still pass `"01"`, `"02"`, etc., but the number is no
 * longer rendered — the right-side stamp read as a table-of-contents
 * artefact rather than as editorial chrome, and dropping it lets the
 * left-hand label carry the section on its own.
 */
export function SectionEyebrow({
  children,
  className,
}: {
  /** Accepted but unrendered — see the note above. */
  index?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 md:mb-16", className)}>
      <span className="eyebrow">{children}</span>
    </div>
  );
}
