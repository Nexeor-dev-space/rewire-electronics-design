"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import type { NavPanel as NavPanelData } from "@/lib/site";

interface NavPanelProps {
  id: string;
  panel: NavPanelData;
  labelledBy: string;
}

/**
 * NavPanel — the disclosure that opens under Categories and Support.
 *
 * Kept deliberately small: a mega menu here means "more whitespace",
 * not "more surface". One hairline border, one soft shadow, no glass —
 * it sits over page content, and frosting it would fight the header
 * chrome directly above.
 */
export function NavPanel({ id, panel, labelledBy }: NavPanelProps) {
  return (
    <motion.div
      id={id}
      aria-labelledby={labelledBy}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      className={cn(
        "absolute left-1/2 top-full -translate-x-1/2 pt-3",
        panel.wide ? "w-[34rem]" : "w-[15rem]",
      )}
    >
      <div className="overflow-hidden rounded-xl border border-line bg-surface p-3 shadow-(--shadow-float)">
        <ul
          className={cn(
            "grid gap-0.5",
            panel.wide ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {panel.items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group/item block rounded-lg px-3.5 py-3 transition-colors duration-(--duration-fast) hover:bg-surface-2"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium tracking-tight text-ink">
                    {item.label}
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3 shrink-0 -translate-x-1 text-ink-faint opacity-0 transition-[opacity,transform] duration-(--duration-fast) ease-(--ease-out-expo) group-hover/item:translate-x-0 group-hover/item:opacity-100"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
                {item.note && (
                  <span className="mt-1 block text-xs leading-snug text-ink-muted">
                    {item.note}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {panel.footer && (
          <div className="mt-2 border-t border-line px-3.5 pb-1 pt-3">
            <Link
              href={panel.footer.href}
              className="group/foot inline-flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink"
            >
              {panel.footer.label}
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3 transition-transform duration-(--duration-fast) ease-(--ease-out-expo) group-hover/foot:translate-x-0.5"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
