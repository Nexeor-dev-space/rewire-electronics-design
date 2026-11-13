"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { NAVIGATION_ADMIN_PATH } from "@/lib/constants";
import { emptyLink, moveBy, removeAt, replaceAt } from "@/lib/navigation-builder";
import { NAV_PART_LABELS } from "@/lib/navigation-config";
import { cn } from "@/lib/utils";
import type { NavLinkItem, RailItem } from "@/types/navigation";
import { LimitHint } from "./limit-hint";
import { LinkRow } from "./link-row";
import { PartRow } from "./part-list";

/** Where a built-in menu with a list of its own is edited. About is edited on this page. */
const DETAIL_PAGES: Partial<Record<string, { href: string; label: string }>> = {
  categories: { href: `${NAVIGATION_ADMIN_PATH}/categories`, label: "Edit categories" },
  drops: { href: `${NAVIGATION_ADMIN_PATH}/upcoming-drops`, label: "Edit upcoming drops" },
};

/**
 * The header rail: the built-in menus and the links staff added, in one
 * ordered list. Menus can be moved and hidden; links also renamed and deleted.
 */
export function RailList({
  items,
  path,
  errors,
  disabled,
  max,
  unsaved,
  onChange,
}: {
  items: RailItem[];
  path: string;
  errors: Record<string, string>;
  disabled: boolean;
  /** How many added links the rail may hold. */
  max: number;
  /** Unsaved edits on the page: a detail page opens from the saved draft, so it waits for a save. */
  unsaved: boolean;
  onChange: (items: RailItem[]) => void;
}) {
  const linkCount = items.filter((item) => "href" in item).length;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => {
        const first = index === 0;
        const last = index === items.length - 1;
        if ("href" in item) {
          return (
            <LinkRow<NavLinkItem>
              key={item.id}
              link={item}
              path={`${path}.${index}`}
              errors={errors}
              disabled={disabled}
              first={first}
              last={last}
              onChange={(next) => onChange(replaceAt<RailItem>(items, index, next))}
              onMove={(offset) => onChange(moveBy(items, index, offset))}
              onDelete={() => onChange(removeAt(items, index))}
            />
          );
        }
        const detail = DETAIL_PAGES[item.id];
        return (
          <PartRow
            key={item.id}
            name={NAV_PART_LABELS[item.id]}
            visible={item.visible}
            first={first}
            last={last}
            disabled={disabled}
            extra={
              detail &&
              (unsaved ? (
                <span className="text-xs text-ink-muted">Save the draft to edit its list</span>
              ) : (
                <Link href={detail.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  {detail.label}
                </Link>
              ))
            }
            onVisible={(visible) => onChange(replaceAt<RailItem>(items, index, { ...item, visible }))}
            onMove={(offset) => onChange(moveBy(items, index, offset))}
          />
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || linkCount >= max}
          onClick={() => onChange([...items, emptyLink()])}
        >
          Add link
        </Button>
        <LimitHint count={linkCount} max={max} error={errors[path]} />
      </div>
    </div>
  );
}
