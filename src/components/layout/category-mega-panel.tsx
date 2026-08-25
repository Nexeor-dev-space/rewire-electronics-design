"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getCategories } from "@/lib/categories";
import type { CategoryNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { megaMenuId } from "./mega-menu";
import { Arrow, MenuCta, MenuImage, MenuLabel } from "./mega-primitives";

/**
 * CategoryMegaPanel — the per-category offcanvas dropdown.
 *
 * Same visual shell as the `MegaMenu` used by Upcoming Drops and the
 * editorial triggers (surface plate, hairline border, soft shadow,
 * pt-3 gap under the bar), but its **content is category-specific**.
 * Every category trigger opens a panel scoped to its own catalogue
 * slice — the brands that actually stock that category, the note that
 * describes it, the image the mega-menu and CategoryCard already use.
 *
 * Bypasses the static `MegaMenu` id → panel registry because that one
 * only knows about the fixed shell panels (drops / categories / about /
 * support); a per-category panel has to be data-driven.
 */

const MAX_BRANDS = 6;

export function CategoryMegaPanel({
  item,
  labelledBy,
  onPointerEnter,
}: {
  item: CategoryNavItem;
  labelledBy: string;
  onPointerEnter: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const category = getCategories().find((c) => c.slug === item.slug);

  const brands = item.brands.slice(0, MAX_BRANDS);
  const totalDevices = item.brands.reduce((sum, b) => sum + b.count, 0);

  const hidden = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -14 };
  const shown = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.div
      id={megaMenuId("categories")}
      aria-labelledby={labelledBy}
      onPointerEnter={onPointerEnter}
      initial={hidden}
      animate={shown}
      exit={hidden}
      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
      className="absolute inset-x-0 top-full hidden pt-3 lg:block"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <div
          className={cn(
            "overflow-hidden rounded-3xl border border-line bg-surface p-12 xl:p-16",
            "shadow-[0_18px_48px_rgb(17_17_17/0.08)]",
          )}
        >
          <div className="grid grid-cols-12 gap-10 xl:gap-14">
            {/* ---------- Intro ---------- */}
            <div className="col-span-3 flex flex-col">
              <MenuLabel>{item.label}</MenuLabel>
              <p className="mt-6 text-[1.75rem] font-light leading-[1.15] tracking-[-0.025em] text-ink">
                {category?.note ?? item.label}.
              </p>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-secondary">
                {totalDevices > 0
                  ? `${totalDevices} device${totalDevices === 1 ? "" : "s"} in stock, filter by brand, condition or price on the shelf.`
                  : "Filter by brand, condition or price on the shelf."}
              </p>
              <div className="mt-auto pt-8">
                <MenuCta href={item.href}>Browse all {item.label}</MenuCta>
              </div>
            </div>

            {/* ---------- Brands ---------- */}
            <div className="col-span-5">
              <MenuLabel>
                {brands.length > 0 ? "Shop by brand" : "In this category"}
              </MenuLabel>
              {brands.length > 0 ? (
                <ul className="mt-5">
                  {brands.map((brand) => (
                    <li key={brand.label}>
                      <Link
                        href={brand.href}
                        className={cn(
                          "group/brand -mx-3 flex items-center gap-5 rounded-xl px-3 py-3",
                          "transition-colors duration-(--duration-fast) hover:bg-surface-2",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.9375rem] font-medium text-ink">
                            {brand.label}
                          </span>
                          <span className="mt-1 block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                            {brand.count} device{brand.count === 1 ? "" : "s"} in stock
                          </span>
                        </span>
                        <Arrow className="shrink-0 text-ink-faint opacity-0 transition-all duration-(--duration-fast) group-hover/brand:translate-x-0.5 group-hover/brand:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-secondary">
                  A single brand curates this shelf right now — head to the
                  collection to see every device inside it.
                </p>
              )}
            </div>

            {/* ---------- Showcase ---------- */}
            <div className="col-span-4">
              <div className="group/card overflow-hidden rounded-2xl border border-line bg-void">
                {category && (
                  <MenuImage
                    src={(category.menuImage ?? category.image).url}
                    alt={(category.menuImage ?? category.image).alt}
                    sizes="(max-width: 1280px) 30vw, 22vw"
                    className="aspect-16/10 w-full"
                  />
                )}
                <div className="p-6">
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                    Certified refurbished
                  </span>
                  <p className="mt-2 text-[1.0625rem] font-medium leading-tight text-ink">
                    {item.label}, tested and warranted.
                  </p>
                  <Link
                    href={item.href}
                    className={cn(
                      "mt-6 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full",
                      "bg-ink text-[0.8125rem] font-medium tracking-tight text-surface",
                      "transition-colors duration-(--duration-fast) hover:bg-ink-hover",
                    )}
                  >
                    Shop {item.label}
                    <Arrow className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
