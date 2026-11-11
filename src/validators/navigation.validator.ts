import { z } from "zod";
import {
  NAV_ABOUT_COLUMNS_MAX,
  NAV_EXTRA_HEADER_LINKS_MAX,
  NAV_FOOTER_BOTTOM_LINKS_MAX,
  NAV_FOOTER_COLUMNS_MAX,
  NAV_HREF_MAX_LENGTH,
  NAV_LABEL_MAX_LENGTH,
  NAV_LINKS_PER_GROUP_MAX,
  NAV_MOBILE_TABS_MAX,
} from "@/lib/constants";
import { linkTargetError } from "@/lib/navigation-config";
import { MOBILE_TAB_ICONS } from "@/types/navigation";

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

export const navigationSchema = z.object({
  header: z.object({
    aboutColumns: capped(groupSchema, NAV_ABOUT_COLUMNS_MAX, "About menu columns"),
    extraLinks: capped(linkSchema, NAV_EXTRA_HEADER_LINKS_MAX, "extra header links"),
  }),
  footer: z.object({
    columns: capped(groupSchema, NAV_FOOTER_COLUMNS_MAX, "footer columns"),
    bottomLinks: capped(linkSchema, NAV_FOOTER_BOTTOM_LINKS_MAX, "bottom bar links"),
  }),
  mobileBar: z.object({
    tabs: capped(tabSchema, NAV_MOBILE_TABS_MAX, "mobile tabs"),
  }),
});

export type NavigationInput = z.infer<typeof navigationSchema>;
