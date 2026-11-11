"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { moveBy, replaceAt } from "@/lib/navigation-builder";
import type { NavPart } from "@/types/navigation";

/** One row of a part: its name, shown or hidden, and up and down. `extra` sits before the controls. */
export function PartRow({
  name,
  visible,
  first,
  last,
  disabled,
  extra,
  onVisible,
  onMove,
}: {
  name: string;
  visible: boolean;
  first: boolean;
  last: boolean;
  disabled: boolean;
  extra?: ReactNode;
  onVisible: (visible: boolean) => void;
  onMove: (offset: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3">
      <span className="min-w-40 flex-1 text-sm text-ink">{name}</span>
      {extra}
      <div className="flex items-center gap-2">
        <Switch
          checked={visible}
          disabled={disabled}
          onChange={onVisible}
          label={`Show ${name} on the storefront`}
        />
        <span className="w-12 text-sm text-ink-secondary">{visible ? "Visible" : "Hidden"}</span>
        <Button variant="ghost" size="sm" disabled={disabled || first} onClick={() => onMove(-1)} aria-label={`Move ${name} up`}>
          ↑
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled || last} onClick={() => onMove(1)} aria-label={`Move ${name} down`}>
          ↓
        </Button>
      </div>
    </div>
  );
}

/** An ordered list of built-in parts: each can be shown or hidden and moved, none added or deleted. */
export function PartList<Id extends string>({
  parts,
  nameOf,
  disabled,
  emptyText,
  extraFor,
  onChange,
}: {
  parts: NavPart<Id>[];
  nameOf: (id: Id) => string;
  disabled: boolean;
  emptyText?: string;
  extraFor?: (part: NavPart<Id>) => ReactNode;
  onChange: (parts: NavPart<Id>[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {parts.length === 0 && emptyText && <p className="text-sm text-ink-secondary">{emptyText}</p>}
      {parts.map((part, index) => (
        <PartRow
          key={part.id}
          name={nameOf(part.id)}
          visible={part.visible}
          first={index === 0}
          last={index === parts.length - 1}
          disabled={disabled}
          extra={extraFor?.(part)}
          onVisible={(visible) => onChange(replaceAt(parts, index, { ...part, visible }))}
          onMove={(offset) => onChange(moveBy(parts, index, offset))}
        />
      ))}
    </div>
  );
}
