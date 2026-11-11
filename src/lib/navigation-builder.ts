import { navigationSchema } from "@/validators/navigation.validator";
import type { MobileTab, NavGroup, NavLinkItem, NavigationConfig } from "@/types/navigation";
import { CATEGORIES_TAB_HREF } from "@/lib/constants";
import { PAGE_LINK_TARGETS, POLICY_LINK_TARGETS } from "@/lib/navigation-config";

/** Pure helpers for the Navigation screen. Client safe, unit tested. */

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const emptyLink = (): NavLinkItem => ({ id: newId("link"), label: "", href: "", visible: true });

export const emptyGroup = (): NavGroup => ({ id: newId("group"), title: "", visible: true, links: [] });

export const emptyTab = (): MobileTab => ({ ...emptyLink(), icon: "info" });

/** The list with the item at `index` moved one place; unchanged at either end. */
export function moveBy<T>(list: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const replaceAt = <T>(list: T[], index: number, item: T): T[] =>
  list.map((existing, i) => (i === index ? item : existing));

export const removeAt = <T>(list: T[], index: number): T[] => list.filter((_, i) => i !== index);

/** Field errors for the whole config, keyed by path: `footer.columns.0.links.1.href`. */
export function navigationErrors(config: NavigationConfig): Record<string, string> {
  const result = navigationSchema.safeParse(config);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return errors;
}

export const hasUnsavedEdits = (local: NavigationConfig, saved: NavigationConfig) =>
  JSON.stringify(local) !== JSON.stringify(saved);

/** The picker option a stored address belongs to; "custom" when it is none of them. */
export const CUSTOM_TARGET = "__custom";

export function targetOptionFor(href: string, allowCategories: boolean): string {
  if (allowCategories && href === CATEGORIES_TAB_HREF) return href;
  const known = [...POLICY_LINK_TARGETS, ...PAGE_LINK_TARGETS].some((target) => target.href === href);
  return known ? href : CUSTOM_TARGET;
}
