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
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const opened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!opened) return;
    headingRef.current?.focus({ preventScroll: true });
    const section = sectionRef.current;
    if (section) return scrollAlongside(section, Boolean(reduceMotion));
  }, [open, reduceMotion]);

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
        className="overflow-hidden"
      >
        <motion.div variants={collapsePanelBody}>
          <div className="mt-5 border-t border-line pt-6">{children}</div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/** A little longer than `collapsePanel`'s open (0.62 s), so the scroll ends after the layout settles. */
const SCROLL_DURATION_MS = 700;

/**
 * Scrolls a section that has just opened to the top of the viewport, in one
 * motion that runs while the step before it collapses and it expands.
 *
 * The easing is on the section's place on screen, not on the scroll
 * position: each frame works out where its top should be on screen (gliding
 * from where it started to just under the progress bar), measures where it
 * is on the page now, and scrolls to match. So the heading only ever moves
 * one way, however fast the step above collapses. (Easing the scroll
 * position instead let a long step's fast collapse carry the heading past
 * the top before the scroll caught up and brought it back: the jerk from
 * Information to Delivery.) Under reduced motion it stays pinned under the
 * progress bar. Any wheel, touch or key stops it, so it never fights the
 * shopper. Returns a cleanup that stops it.
 */
function scrollAlongside(section: HTMLElement, instant: boolean): () => void {
  const root = document.documentElement;
  const startTop = section.getBoundingClientRect().top;
  const startTime = performance.now();
  let frame = 0;
  let stopped = false;

  // A long step collapsing shrinks the page by hundreds of pixels. Without
  // this the browser would clamp the scroll position the moment the page got
  // shorter (the jerk from Information to Delivery), so the page keeps its
  // height until the scroll ends; the extra room sits below the footer.
  // Scroll anchoring is off meanwhile, so the browser doesn't adjust the
  // position against this scroll either.
  const previous = { minHeight: root.style.minHeight, overflowAnchor: root.style.overflowAnchor };
  root.style.minHeight = `${root.scrollHeight}px`;
  root.style.overflowAnchor = "none";

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    root.style.minHeight = previous.minHeight;
    root.style.overflowAnchor = previous.overflowAnchor;
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };

  const step = (now: number) => {
    const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    // The body is not stretched by the root's min-height, so its bottom is
    // where the page really ends. Never aim past that, or the scroll would
    // jump when the extra room is removed.
    const maxY = document.body.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    // The first frame's timestamp can fall just before `startTime`.
    const progress = Math.min(1, Math.max(0, now - startTime) / SCROLL_DURATION_MS);
    const eased = instant ? 1 : 1 - (1 - progress) ** 3;
    const screenTop = startTop + (margin - startTop) * eased;
    const pageTop = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, Math.min(pageTop - screenTop, maxY)));
    if (progress < 1) frame = requestAnimationFrame(step);
    else stop();
  };

  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);
  frame = requestAnimationFrame(step);
  return stop;
}
