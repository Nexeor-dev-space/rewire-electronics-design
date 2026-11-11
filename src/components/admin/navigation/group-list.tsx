"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NAV_LABEL_MAX_LENGTH, NAV_LINKS_PER_GROUP_MAX } from "@/lib/constants";
import { emptyGroup, moveBy, removeAt, replaceAt } from "@/lib/navigation-builder";
import type { NavGroup } from "@/types/navigation";
import { LimitHint } from "./limit-hint";
import { LinkList } from "./link-list";

interface GroupListProps {
  groups: NavGroup[];
  /** Where the list lives, e.g. `footer.columns`. */
  path: string;
  errors: Record<string, string>;
  disabled: boolean;
  max: number;
  /** What a group is called on this screen, e.g. "column". */
  noun: string;
  onChange: (groups: NavGroup[]) => void;
}

/** Titled groups of links (menu or footer columns), each reorderable, hideable and deletable. */
export function GroupList({ groups, path, errors, disabled, max, noun, onChange }: GroupListProps) {
  const atLimit = groups.length >= max;

  return (
    <div className="flex flex-col gap-4">
      {groups.length === 0 && <p className="text-sm text-ink-secondary">No {noun}s yet.</p>}
      {groups.map((group, index) => {
        const groupPath = `${path}.${index}`;
        const name = group.title || noun;
        const titleError = errors[`${groupPath}.title`];
        return (
          <section key={group.id} className="rounded-xl border border-line p-4">
            <div className="mb-3 flex flex-wrap items-start gap-3">
              <div className="min-w-48 flex-1">
                <Input
                  aria-label={`Title of ${name}`}
                  placeholder="Title"
                  maxLength={NAV_LABEL_MAX_LENGTH}
                  value={group.title}
                  disabled={disabled}
                  aria-invalid={Boolean(titleError)}
                  className="h-10 font-medium"
                  onChange={(event) =>
                    onChange(replaceAt(groups, index, { ...group, title: event.target.value }))
                  }
                />
                <FieldError>{titleError}</FieldError>
              </div>
              <div className="flex items-center gap-2 pt-1.5">
                <Switch
                  checked={group.visible}
                  disabled={disabled}
                  onChange={(visible) => onChange(replaceAt(groups, index, { ...group, visible }))}
                  label={`Show ${name} on the storefront`}
                />
                <span className="w-12 text-sm text-ink-secondary">
                  {group.visible ? "Visible" : "Hidden"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveBy(groups, index, -1))}
                  aria-label={`Move ${name} up`}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || index === groups.length - 1}
                  onClick={() => onChange(moveBy(groups, index, 1))}
                  aria-label={`Move ${name} down`}
                >
                  ↓
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onChange(removeAt(groups, index))}
                  aria-label={`Delete ${name}`}
                >
                  Delete
                </Button>
              </div>
            </div>
            <LinkList
              links={group.links}
              path={`${groupPath}.links`}
              errors={errors}
              disabled={disabled}
              max={NAV_LINKS_PER_GROUP_MAX}
              addLabel="Add link"
              emptyText="No links. An empty group is not shown on the storefront."
              onChange={(links) => onChange(replaceAt(groups, index, { ...group, links }))}
            />
          </section>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={disabled || atLimit} onClick={() => onChange([...groups, emptyGroup()])}>
          Add {noun}
        </Button>
        <LimitHint count={groups.length} max={max} error={errors[path]} />
      </div>
    </div>
  );
}
