"use client";

import { Button } from "@/components/ui/button";
import { emptyLink, emptyTab, moveBy, removeAt, replaceAt } from "@/lib/navigation-builder";
import type { NavLinkItem } from "@/types/navigation";
import { LimitHint } from "./limit-hint";
import { LinkRow } from "./link-row";

interface LinkListProps<T extends NavLinkItem> {
  links: T[];
  /** Where the list lives, e.g. `header.extraLinks`. */
  path: string;
  errors: Record<string, string>;
  disabled: boolean;
  max: number;
  addLabel: string;
  emptyText: string;
  isTab?: boolean;
  onChange: (links: T[]) => void;
}

/** An ordered list of links with add, and its limit shown beside the button. */
export function LinkList<T extends NavLinkItem>({
  links,
  path,
  errors,
  disabled,
  max,
  addLabel,
  emptyText,
  isTab = false,
  onChange,
}: LinkListProps<T>) {
  const atLimit = links.length >= max;

  return (
    <div className="flex flex-col gap-2">
      {links.length === 0 && <p className="text-sm text-ink-secondary">{emptyText}</p>}
      {links.map((link, index) => (
        <LinkRow
          key={link.id}
          link={link}
          path={`${path}.${index}`}
          errors={errors}
          disabled={disabled}
          first={index === 0}
          last={index === links.length - 1}
          isTab={isTab}
          onChange={(next) => onChange(replaceAt(links, index, next))}
          onMove={(offset) => onChange(moveBy(links, index, offset))}
          onDelete={() => onChange(removeAt(links, index))}
        />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || atLimit}
          onClick={() => onChange([...links, (isTab ? emptyTab() : emptyLink()) as unknown as T])}
        >
          {addLabel}
        </Button>
        <LimitHint count={links.length} max={max} error={errors[path]} />
      </div>
    </div>
  );
}
