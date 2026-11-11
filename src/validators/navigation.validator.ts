import { z } from "zod";
import {
  NAV_ABOUT_COLUMNS_MAX,
  NAV_EXTRA_HEADER_LINKS_MAX,
  NAV_FOOTER_BOTTOM_LINKS_MAX,
  NAV_FOOTER_COLUMNS_MAX,
  NAV_HREF_MAX_LENGTH,
  NAV_LABEL_MAX_LENGTH,
  NAV_LINKS_PER_GROUP_MAX,
  NAV_MENU_ITEMS_MAX,
  NAV_MOBILE_TABS_MAX,
} from "@/lib/constants";
import { linkTargetError } from "@/lib/navigation-config";
import {
  FOOTER_BASE_PARTS,
  FOOTER_TOP_PARTS,
  MOBILE_TAB_ICONS,
  RAIL_PARTS,
  TOP_BAR_PARTS,
} from "@/types/navigation";

/**
 * The whole navigation draft, as the Navigation screen saves it. Refusals
 * name the field so the screen can show them on the right input.
 */

const labelSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(NAV_LABEL_MAX_LENGTH, `Use ${NAV_LABEL_MAX_LENGTH} characters or fewer.`);

const idSchema = z.string().min(1).max(64);

const hrefSchema = (allowCategories: boolean) =>
  z
    .string()
    .trim()
    .max(NAV_HREF_MAX_LENGTH, `Use ${NAV_HREF_MAX_LENGTH} characters or fewer.`)
    .superRefine((value, ctx) => {
      const message = linkTargetError(value, allowCategories);
      if (message) ctx.addIssue({ code: "custom", message });
    });

const linkSchema = z.object({
  id: idSchema,
  label: labelSchema,
  href: hrefSchema(false),
  visible: z.boolean(),
});

const groupSchema = z.object({
  id: idSchema,
  title: labelSchema,
  visible: z.boolean(),
  links: z
    .array(linkSchema)
    .max(NAV_LINKS_PER_GROUP_MAX, `A group holds at most ${NAV_LINKS_PER_GROUP_MAX} links.`),
});

const tabSchema = linkSchema.extend({
  href: hrefSchema(true),
  icon: z.enum(MOBILE_TAB_ICONS),
});

const capped = <T extends z.ZodType>(item: T, max: number, noun: string) =>
  z.array(item).max(max, `At most ${max} ${noun}.`);

/** A built-in part: a fixed list of ids, each present exactly once, in any order. */
const partsSchema = (ids: readonly [string, ...string[]], noun: string) =>
  z
    .array(z.object({ id: z.enum(ids), visible: z.boolean() }))
    .refine((list) => new Set(list.map((part) => part.id)).size === ids.length && list.length === ids.length, {
      message: `Every ${noun} part must appear once.`,
    });

/** A rail entry is a built-in menu, or a link staff added (which then needs a name and an address). */
const railItemSchema = z
  .object({
    id: idSchema,
    visible: z.boolean(),
    label: z.string().optional(),
    href: z.string().optional(),
  })
  .superRefine((item, ctx) => {
    if ((RAIL_PARTS as readonly string[]).includes(item.id)) return;
    const label = labelSchema.safeParse(item.label ?? "");
    if (!label.success) ctx.addIssue({ code: "custom", path: ["label"], message: label.error.issues[0].message });
    const href = hrefSchema(false).safeParse(item.href ?? "");
    if (!href.success) ctx.addIssue({ code: "custom", path: ["href"], message: href.error.issues[0].message });
  });

const menuPartsSchema = z
  .array(z.object({ id: idSchema, visible: z.boolean() }))
  .max(NAV_MENU_ITEMS_MAX, `At most ${NAV_MENU_ITEMS_MAX} entries.`);

const railSchema = z
  .array(railItemSchema)
  .superRefine((list, ctx) => {
    const builtIns = list.filter((item) => (RAIL_PARTS as readonly string[]).includes(item.id));
    if (new Set(builtIns.map((item) => item.id)).size !== RAIL_PARTS.length || builtIns.length !== RAIL_PARTS.length) {
      ctx.addIssue({ code: "custom", message: "Every header menu must appear once." });
    }
    if (list.length - builtIns.length > NAV_EXTRA_HEADER_LINKS_MAX) {
      ctx.addIssue({ code: "custom", message: `At most ${NAV_EXTRA_HEADER_LINKS_MAX} extra header links.` });
    }
  });

export const navigationSchema = z.object({
  header: z.object({
    topBar: partsSchema(TOP_BAR_PARTS, "top bar"),
    rail: railSchema,
    aboutColumns: capped(groupSchema, NAV_ABOUT_COLUMNS_MAX, "About menu columns"),
    categories: menuPartsSchema,
    drops: menuPartsSchema,
  }),
  footer: z.object({
    top: partsSchema(FOOTER_TOP_PARTS, "footer"),
    base: partsSchema(FOOTER_BASE_PARTS, "footer"),
    columns: capped(groupSchema, NAV_FOOTER_COLUMNS_MAX, "footer columns"),
    bottomLinks: capped(linkSchema, NAV_FOOTER_BOTTOM_LINKS_MAX, "bottom bar links"),
  }),
  mobileBar: z.object({
    tabs: capped(tabSchema, NAV_MOBILE_TABS_MAX, "mobile tabs"),
  }),
});

export type NavigationInput = z.infer<typeof navigationSchema>;
