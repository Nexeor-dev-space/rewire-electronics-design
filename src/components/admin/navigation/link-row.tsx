"use client";

import { MOBILE_TAB_ICON_COMPONENTS } from "@/components/layout/nav-icons";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NAV_HREF_MAX_LENGTH, NAV_LABEL_MAX_LENGTH } from "@/lib/constants";
import { CUSTOM_TARGET, targetOptionFor } from "@/lib/navigation-builder";
import {
  CATEGORIES_LINK_TARGET,
  PAGE_LINK_TARGETS,
  POLICY_LINK_TARGETS,
} from "@/lib/navigation-config";
import {
  MOBILE_TAB_ICONS,
  type MobileTab,
  type MobileTabIcon,
  type NavLinkItem,
} from "@/types/navigation";

const ICON_LABELS: Record<MobileTabIcon, string> = {
  home: "Home",
  categories: "Grid",
  cart: "Cart",
  wishlist: "Heart",
  account: "Person",
  drops: "Clock",
  info: "Info",
  support: "Chat",
  tag: "Tag",
};

interface LinkRowProps<T extends NavLinkItem> {
  link: T;
  /** Where this row's errors live, e.g. `footer.columns.0.links.1`. */
  path: string;
  errors: Record<string, string>;
  disabled: boolean;
  first: boolean;
  last: boolean;
  /** A mobile tab: shows the icon picker and offers the category list. */
  isTab?: boolean;
  onChange: (link: T) => void;
  onMove: (offset: -1 | 1) => void;
  onDelete: () => void;
}

/** One link (or mobile tab): name, where it goes, shown or hidden, order, delete. */
export function LinkRow<T extends NavLinkItem>({
  link,
  path,
  errors,
  disabled,
  first,
  last,
  isTab = false,
  onChange,
  onMove,
  onDelete,
}: LinkRowProps<T>) {
  const option = targetOptionFor(link.href, isTab);
  const name = link.label || "link";
  const labelError = errors[`${path}.label`];
  const hrefError = errors[`${path}.href`];
  const tab = isTab ? (link as unknown as MobileTab) : null;
  const Icon = tab ? MOBILE_TAB_ICON_COMPONENTS[tab.icon] : null;

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-line bg-surface p-3">
      <div className="min-w-40 flex-1">
        <Input
          aria-label={`Name of ${name}`}
          placeholder="Name"
          maxLength={NAV_LABEL_MAX_LENGTH}
          value={link.label}
          disabled={disabled}
          aria-invalid={Boolean(labelError)}
          className="h-10"
          onChange={(event) => onChange({ ...link, label: event.target.value })}
        />
        <FieldError>{labelError}</FieldError>
      </div>

      <div className="min-w-48 flex-[2]">
        <Select
          aria-label={`Link for ${name}`}
          value={option}
          disabled={disabled}
          className="h-10"
          onChange={(event) => {
            const value = event.target.value;
            onChange({ ...link, href: value === CUSTOM_TARGET ? "" : value });
          }}
        >
          {isTab && <option value={CATEGORIES_LINK_TARGET.href}>{CATEGORIES_LINK_TARGET.label}</option>}
          <optgroup label="Policy pages">
            {POLICY_LINK_TARGETS.map((target) => (
              <option key={target.href} value={target.href}>
                {target.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Storefront pages">
            {PAGE_LINK_TARGETS.map((target) => (
              <option key={target.href} value={target.href}>
                {target.label}
              </option>
            ))}
          </optgroup>
          <option value={CUSTOM_TARGET}>External address or other path</option>
        </Select>
        {option === CUSTOM_TARGET && (
          <Input
            aria-label={`Address for ${name}`}
            placeholder="https://example.com or /page"
            maxLength={NAV_HREF_MAX_LENGTH}
            value={link.href}
            disabled={disabled}
            aria-invalid={Boolean(hrefError)}
            className="mt-2 h-10"
            onChange={(event) => onChange({ ...link, href: event.target.value })}
          />
        )}
        <FieldError>{hrefError}</FieldError>
      </div>

      {tab && Icon && (
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-ink-secondary" />
          <Select
            aria-label={`Icon for ${name}`}
            value={tab.icon}
            disabled={disabled}
            className="h-10 w-28"
            onChange={(event) =>
              onChange({ ...link, icon: event.target.value as MobileTabIcon })
            }
          >
            {MOBILE_TAB_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {ICON_LABELS[icon]}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1.5">
        <Switch
          checked={link.visible}
          disabled={disabled}
          onChange={(visible) => onChange({ ...link, visible })}
          label={`Show ${name} on the storefront`}
        />
        <span className="w-12 text-sm text-ink-secondary">{link.visible ? "Visible" : "Hidden"}</span>
        <Button variant="ghost" size="sm" disabled={disabled || first} onClick={() => onMove(-1)} aria-label={`Move ${name} up`}>
          ↑
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled || last} onClick={() => onMove(1)} aria-label={`Move ${name} down`}>
          ↓
        </Button>
        <Button variant="outline" size="sm" disabled={disabled} onClick={onDelete} aria-label={`Delete ${name}`}>
          Delete
        </Button>
      </div>
    </div>
  );
}
