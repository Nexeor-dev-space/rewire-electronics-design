"use client";

import { useState } from "react";
import Link from "next/link";
import { getUpcomingDrops } from "@/lib/drops";
import { getCategories } from "@/lib/categories";
import Image from "next/image";
import { aboutColumns, shopBrowse, shopPopular } from "@/lib/navigation";
import {
  productHrefForCategory,
  productHrefForDrop,
  SHOP_INDEX_HREF,
} from "@/lib/route-map";
import { shopHrefForTerm } from "@/lib/shop";
import { Countdown } from "@/components/ui/countdown";
import { formatDropDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Arrow,
  MenuCta,
  MenuImage,
  MenuItem,
  MenuLabel,
  MenuSupportBox,
} from "./mega-primitives";

export interface MegaPanelProps {
  onJoinWaitlist: () => void;
}

/* ============================================================
   Upcoming Drops — the release calendar
   ============================================================ */

export function DropsMenu({ onJoinWaitlist }: MegaPanelProps) {
  const drops = getUpcomingDrops();
  const rest = drops.slice(0, 4);

  // The showcase card mirrors whichever calendar row the pointer (or
  // keyboard focus) is on, defaulting to the first drop. Hover sets it
  // and *leaves it set* — clearing on mouse-leave would snap the card
  // back to drop 1 while the pointer travels toward the card the reader
  // just chose to look at.
  const [activeId, setActiveId] = useState(drops[0]?.id);
  const featured = drops.find((drop) => drop.id === activeId) ?? drops[0];

  return (
    <div className="grid grid-cols-12 gap-10 xl:gap-14">
      {/* ---------- The argument ---------- */}
      <div className="col-span-3 flex flex-col">
        <MenuLabel>Upcoming</MenuLabel>
        <p className="mt-6 text-[1.75rem] font-light leading-[1.15] tracking-[-0.025em] text-ink">
          Limited refurbished releases.
        </p>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-secondary">
          Numbered editions, released on a schedule. When a drop is gone, it is
          gone.
        </p>
        <div className="mt-auto pt-8">
          <MenuCta href={SHOP_INDEX_HREF}>View Upcoming Drops</MenuCta>
        </div>
      </div>

      {/* ---------- The calendar ---------- */}
      <div className="col-span-5">
        <MenuLabel>Upcoming devices</MenuLabel>
        <ul className="mt-5">
          {rest.map((drop) => {
            const isActive = drop.id === featured?.id;
            return (
              <li key={drop.id}>
                <Link
                  href={productHrefForDrop(drop.slug)}
                  onMouseEnter={() => setActiveId(drop.id)}
                  onFocus={() => setActiveId(drop.id)}
                  className={cn(
                    "group/card -mx-3 flex items-center gap-5 rounded-xl px-3 py-3",
                    "transition-colors duration-(--duration-fast)",
                    // The row driving the showcase stays lit, so the
                    // list and the card read as one connected control
                    // rather than a hover style that happens to match.
                    isActive ? "bg-surface-2" : "hover:bg-surface-2",
                  )}
                >
                  <MenuImage
                    src={drop.image.url}
                    alt=""
                    sizes="64px"
                    className="size-16 shrink-0 rounded-lg border border-line"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium text-ink">
                      {drop.name}
                    </span>
                    <span className="mt-1 block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                      {formatDropDate(drop.startsAt)} · {drop.units} units
                    </span>
                  </span>
                  <Arrow
                    className={cn(
                      "shrink-0 text-ink-faint transition-all duration-(--duration-fast)",
                      isActive
                        ? "translate-x-0.5 opacity-100"
                        : "opacity-0 group-hover/card:translate-x-0.5 group-hover/card:opacity-100",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ---------- The showcase ----------
          Mirrors the hovered calendar row. `key={featured.id}` remounts
          the card content on switch so the image swaps clean instead of
          showing the previous drop's photo while the next one loads. */}
      <div className="col-span-4">
        <div
          key={featured.id}
          className="group/card overflow-hidden rounded-2xl border border-line bg-void"
        >
          <MenuImage
            src={featured.image.url}
            alt={featured.image.alt}
            priority
            sizes="(max-width: 1280px) 30vw, 22vw"
            className="aspect-16/10 w-full"
          />
          <div className="p-6">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
              {featured.edition}
            </span>
            <p className="mt-2 text-[1.0625rem] font-medium leading-tight text-ink">
              {featured.name}
            </p>

            <div className="mt-5 border-t border-line pt-4">
              <Countdown
                compact
                target={featured.startsAt}
                label={`${featured.name} drop opens in`}
                className="text-sm text-ink"
              />
              <p className="mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-warn">
                Only {featured.units} devices
              </p>
            </div>

            <button
              type="button"
              onClick={onJoinWaitlist}
              className={cn(
                "mt-6 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full",
                "bg-ink text-[0.8125rem] font-medium tracking-tight text-surface",
                "transition-colors duration-(--duration-fast) hover:bg-ink-hover",
              )}
            >
              Join Waitlist
              <Arrow className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Shop — the catalogue
   ============================================================ */

export function ShopMenu() {
  return (
    <div className="grid grid-cols-12 gap-10 xl:gap-14">
      <div className="col-span-3">
        <MenuLabel>Browse</MenuLabel>
        <ul className="mt-5">
          {shopBrowse.map((item) => (
            <MenuItem key={item.href} item={item} />
          ))}
        </ul>
      </div>

      <div className="col-span-3">
        <MenuLabel>Popular</MenuLabel>
        <ul className="mt-5">
          {shopPopular.map((term) => (
            <MenuItem
              key={term}
              item={{
                label: term,
                // Resolves to the shop, pre-filtered by category and
                // brand. These used to point at `/search?q=…`, a route
                // that has never existed — every one of them 404'd.
                href: shopHrefForTerm(term),
              }}
            />
          ))}
        </ul>
      </div>

      <div className="col-span-6">
        <Link
          href={SHOP_INDEX_HREF}
          className={cn(
            "group/card flex h-full overflow-hidden rounded-2xl border border-line bg-void",
            "transition-[border-color] duration-(--duration-base) ease-(--ease-out-expo)",
            "hover:border-line-strong",
          )}
        >
          <MenuImage
            src="/images/drops/drop-02.jpg"
            alt="A restored titanium laptop on a lit studio surface"
            sizes="(max-width: 1280px) 40vw, 32vw"
            className="w-1/2 shrink-0"
          />
          <span className="flex flex-1 flex-col justify-center p-8">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
              The collection
            </span>
            <span className="mt-3 text-[1.5rem] font-light leading-[1.15] tracking-[-0.025em] text-ink">
              Certified Refurbished
            </span>
            <span className="mt-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
              Every device inspected across 68 points, battery verified, and
              covered for a full year.
            </span>
            <span className="mt-6 inline-flex items-center gap-2.5 text-[0.9375rem] font-medium text-ink">
              Shop Collection
              <Arrow className="transition-transform duration-(--duration-fast) ease-(--ease-out-quart) group-hover/card:translate-x-1" />
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

/* ============================================================
   Categories — the way in
   ============================================================ */

export function CategoriesMenu() {
  const categories = getCategories();

  return (
    <div>
      <div className="flex items-baseline justify-between gap-6">
        <MenuLabel>Shop by category</MenuLabel>
        <MenuCta href={SHOP_INDEX_HREF} className="text-[0.875rem]">
          Browse everything
        </MenuCta>
      </div>

      <ul className="mt-8 grid grid-cols-3 gap-5 xl:grid-cols-6 xl:gap-6">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={productHrefForCategory(category.slug)}
              className={cn(
                "group/card relative block overflow-hidden rounded-2xl border border-line bg-surface-2",
                // Wide plate, not a portrait tile — the menu has to stay
                // shallow enough to read as chrome, not a page.
                "aspect-3/2",
                "transition-[transform,border-color] duration-(--duration-base) ease-(--ease-out-expo)",
                "hover:-translate-y-1 hover:border-line-strong",
                "motion-reduce:hover:translate-y-0",
              )}
            >
              {/* The photograph is the box. Decorative — the name below
                  carries the accessible label. Prefers the wide cut; the
                  portrait rail shot is only a fallback. */}
              <Image
                src={(category.menuImage ?? category.image).url}
                alt=""
                fill
                sizes="(max-width: 1280px) 30vw, 16vw"
                className={cn(
                  "object-cover",
                  "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
                  "group-hover/card:scale-[1.04]",
                )}
              />

              {/* One uniform light-dark wash across the whole plate. The
                  earlier build layered a flat scrim under a bottom-heavy
                  gradient; that read as darkened toward the foot on some
                  photographs and pitch-black on others. A single 40% ink
                  wash puts every card on the same tonal footing so the
                  labels sit consistently across the row, and eases up a
                  hair on hover as the picture scales behind it. */}
              <span
                aria-hidden
                className="absolute inset-0 bg-black/40 transition-colors duration-(--duration-base) ease-(--ease-out-expo) group-hover/card:bg-black/30"
              />

              <span className="absolute inset-x-0 bottom-0 p-5">
                <span className="block text-[0.9375rem] font-medium text-ink [text-shadow:0_1px_8px_rgb(17_17_17/0.55)]">
                  {category.name}
                </span>
                <span className="mt-1 block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink/75 [text-shadow:0_1px_8px_rgb(17_17_17/0.55)]">
                  {category.count} devices
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   About — the company, and how to reach it
   ============================================================ */

/**
 * One panel where there were two. About and Support were separate
 * triggers opening separate panels, and each linked to the other —
 * About's last item was "Support", Support's quick links included
 * Warranty, which About also carried. A shopper looking for the returns
 * window had to guess which heading owned it.
 *
 * Left: the company, then the policies, both from `aboutColumns` —
 * whose `/support#…` hrefs are generated from the support page's own
 * anchors, so a renamed section cannot become a dead menu link.
 *
 * Right: the support box, lifted verbatim from the old Support panel
 * (`MenuSupportBox`, now a shared primitive). It replaces the "Built to
 * be kept." plate, which was a photograph linking to `/about` — the
 * page the trigger beside it already opens.
 */
export function AboutMenu() {
  return (
    <div className="grid grid-cols-12 gap-10 xl:gap-14">
      {aboutColumns.map((column) => (
        <div key={column.title} className="col-span-4">
          <MenuLabel>{column.title}</MenuLabel>
          <ul className="mt-5">
            {column.items.map((item) => (
              <MenuItem key={item.href + item.label} item={item} />
            ))}
          </ul>
        </div>
      ))}

      <div className="col-span-4">
        <MenuSupportBox className="h-full" />
      </div>
    </div>
  );
}
