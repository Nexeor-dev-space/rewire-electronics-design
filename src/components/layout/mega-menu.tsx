"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MegaMenuId } from "@/lib/navigation";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  DropsMenu,
  ShopMenu,
  CategoriesMenu,
  AboutMenu,
  type MegaPanelProps,
} from "./mega-panels";

export const megaMenuId = (id: MegaMenuId) => `mega-menu-${id}`;

/**
 * `support` is gone from this registry along with its panel: Support
 * merged into About, which now carries the policy links on the left and
 * the support box on the right.
 */
const PANELS: Record<MegaMenuId, (props: MegaPanelProps) => React.ReactElement> = {
  drops: DropsMenu,
  shop: ShopMenu,
  categories: CategoriesMenu,
  about: AboutMenu,
};

/**
 * MegaMenu — the shell every panel shares.
 *
 * Anchored to the bar's bottom edge and sized to the page container, so a
 * panel lines up with the grid the rest of the site is set on rather than
 * bleeding edge to edge. One white plate, one hairline, one soft shadow —
 * no glass, because it sits directly under chrome that may itself be
 * frosted and two blurred layers read as fog.
 *
 * `onPointerEnter` cancels the close the bar scheduled when the pointer
 * left it, which is what lets the pointer cross the gap into the panel.
 */
export function MegaMenu({
  id,
  labelledBy,
  onPointerEnter,
  onJoinWaitlist,
}: {
  id: MegaMenuId;
  labelledBy: string;
  onPointerEnter: () => void;
  onJoinWaitlist: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const Panel = PANELS[id];

  const hidden = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -14 };
  const shown = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.div
      id={megaMenuId(id)}
      aria-labelledby={labelledBy}
      onPointerEnter={onPointerEnter}
      initial={hidden}
      animate={shown}
      exit={hidden}
      transition={{ duration: DURATION.menu, ease: EASE_OUT_EXPO }}
      className="absolute inset-x-0 top-full hidden pt-3 lg:block"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <div
          className={cn(
            "overflow-hidden rounded-3xl border border-line bg-surface",
            "shadow-[0_18px_48px_rgb(17_17_17/0.08)]",
            "p-12 xl:p-16",
          )}
        >
          <Panel onJoinWaitlist={onJoinWaitlist} />
        </div>
      </div>
    </motion.div>
  );
}
