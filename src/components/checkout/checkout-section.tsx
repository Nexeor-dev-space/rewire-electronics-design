"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { collapsePanel, collapsePanelBody } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type CheckoutSectionState = "active" | "done" | "locked";

interface Props {
  id: string;
  index: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  state: CheckoutSectionState;
  summary?: ReactNode;
  onEdit?: () => void;
  children: ReactNode;
}

export function CheckoutSection({
  id,
  index,
  title,
  description,
  aside,
  state,
  summary,
  onEdit,
  children,
}: Props) {
  const open = state === "active";
  const headingId = `${id}-heading`;
  const panelId = `${id}-panel`;
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(open);
  const scrollOnOpen = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (open && !wasOpen.current) {
      scrollOnOpen.current = true;
      headingRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);

  function handleAnimationComplete(definition: unknown) {
    if (definition !== "visible" || !scrollOnOpen.current) return;
    scrollOnOpen.current = false;
    sectionRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-32 rounded-2xl border bg-surface p-6 sm:scroll-mt-36 sm:p-8 md:scroll-mt-40",
        "transition-[border-color] duration-(--duration-fast)",
        open ? "border-line-strong" : "border-line",
      )}
    >
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 items-baseline gap-4">
          <span
            aria-hidden
            className={cn(
              "font-mono text-[0.75rem] uppercase tracking-[0.2em]",
              state === "done" ? "text-accent" : "text-ink-faint",
            )}
          >
            {index}
          </span>
          <div className="min-w-0">
            <h2
              ref={headingRef}
              id={headingId}
              tabIndex={-1}
              className={cn(
                "text-[1.25rem] font-medium leading-tight tracking-[-0.015em] focus:outline-none sm:text-[1.375rem]",
                state === "locked" ? "text-ink-muted" : "text-ink",
              )}
            >
              {title}
            </h2>
            {open && description && (
              <p className="mt-1 text-[0.8125rem] text-ink-secondary">
                {description}
              </p>
            )}
            {state === "done" && summary && (
              <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
                {summary}
              </p>
            )}
          </div>
        </div>
        {open && aside && <div className="shrink-0 text-[0.8125rem]">{aside}</div>}
        {state === "done" && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-expanded={false}
            aria-controls={panelId}
            aria-label={`Edit ${title.toLowerCase()}`}
            className="shrink-0 text-[0.8125rem] font-medium text-ink underline decoration-line underline-offset-4 transition-colors duration-(--duration-fast) hover:decoration-ink"
          >
            Edit
          </button>
        )}
      </header>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        inert={!open}
        initial={false}
        animate={open ? "visible" : "hidden"}
        variants={collapsePanel}
        onAnimationComplete={handleAnimationComplete}
        className="overflow-hidden"
      >
        <motion.div variants={collapsePanelBody}>
          <div className="mt-5 border-t border-line pt-6">{children}</div>
        </motion.div>
      </motion.div>
    </section>
  );
}
