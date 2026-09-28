# Homepage CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the storefront homepage from a published, database-managed section list, with a console screen to edit, reorder, show/hide and publish it.

**Architecture:** Each homepage section is a `HomepageSection` row that exists twice — once as `DRAFT` (what the console edits) and once as `LIVE` (what shoppers see). Publish copies draft → live in one transaction; discard copies live → draft. One client-safe rules table (`src/lib/homepage-sections.ts`) decides which fields each section type carries, and both the console form and the service check input against it. The storefront reads live rows through a cached service call and maps each section type to a component.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma 7 (PostgreSQL), Zod 4, TanStack React Query, framer-motion, Tailwind v4.

**Spec:** [docs/superpowers/specs/2026-09-24-homepage-cms-design.md](../specs/2026-09-24-homepage-cms-design.md)

## Global Constraints

- **No commits.** The repo owner makes every commit. Leave all changes in the working tree; never run `git commit`, `git reset` or other history-writing git commands.
- **No `.env` access, even indirectly.** Do not run `next build`, `next dev`, `npm run db:*`, `npx prisma …` or the seed. The owner runs them. Do not hand-write migration SQL.
- **No test runner exists** and adding one is out of scope. Each task's gate is `npx tsc --noEmit` and `npm run lint`, plus the manual checks listed for the owner in Task 10.
- Follow `docs/DATA-LAYER.md`: Zod on every input, `authorizeApi(PERMISSIONS.homepage)` first in every route, return only through `apiSuccess` / `apiError` / `apiErrorFrom`, paths only in `api-endpoints.ts`, hooks in `use-homepage.ts`, every mutation invalidates `["homepage"]`.
- Never import Prisma or `@/generated/prisma` into client code. `src/lib/homepage-sections.ts` must stay free of `server-only`, Prisma and Next imports — `prisma/seed.ts` and client components import it.
- Colours, spacing, radius, easings, durations from `globals.css` tokens and `src/lib/motion.ts`. Match the surrounding components' class vocabulary.
- Draft section cap: **30**. Refs per featured section: **12**. Text limits: eyebrow 60, title 120, subtitle 300, description 600, ctaLabel 40, ctaHref 300.
- `ctaHref` accepts site paths starting with a single `/` and `https:` URLs only.
- Product and drop data inside sections keeps its current source (`src/lib/products.ts`, `src/lib/drops.ts`, `src/lib/testimonials.ts`, `CONDITION_META`). The CMS stores no product, pricing, stock or release data.

## Review Focus

1. **A banner image replaced in the draft while the live page still shows the old one** — the old asset must survive until a publish replaces the live row. Covered by `releaseImage` counting `homepageSections` of both stages (Task 1) and publish releasing only the old live images after the copy (Task 3); owner check 4 in Task 10.
2. **A featured brand or category deleted or renamed after publish** — the storefront must drop or rename it immediately, not show a stale card with a dead image. Covered by `revalidateTag(HOMEPAGE_TAG)` in the brand and category services (Task 3); owner check 7.
3. **A reorder sent from a stale tab** (another tab added or deleted a section, or the ids repeat) — must answer 422 "The page changed since you loaded it", not scramble `sortOrder`. Covered in `reorderHomepageSections` (Task 3); owner check 8.
4. **Unsafe or protocol-relative links** (`//evil.com`, `javascript:alert(1)`, `http://…`) in `ctaHref` — must be refused with a field error. Covered by `isSafeHref` (Task 2); owner check 9.
5. **An unseeded or never-published database** — the console must show an empty state, Discard must refuse with a clear message, and Publish of an empty draft must refuse rather than blank the storefront. Covered in `publishHomepage` / `discardHomepageDraft` (Task 3) and the builder's empty state (Task 5); owner check 10.

---

## File map

| File | Responsibility |
| --- | --- |
| `prisma/schema/homepage.prisma` (new) | `HomepageSection`, `HomepageState`, enums |
| `prisma/schema/media.prisma` | `MediaAsset.homepageSections` back-relation |
| `src/lib/storage/image-storage.ts`, `src/services/media.service.ts` | Count homepage sections as image references; `imageExists` |
| `src/lib/homepage-sections.ts` (new) | Client-safe rules table, `checkSectionFields`, `isSafeHref`, `headingLines`, limits, cache tag |
| `src/validators/homepage.validator.ts` (new) | Zod schemas for section body, create, reorder |
| `src/types/homepage.ts` (new) | Console and storefront response types |
| `src/lib/auth/permissions.ts` | `PERMISSIONS.homepage` |
| `src/lib/api/api-endpoints.ts` | `API_ENDPOINTS.admin.homepage` |
| `src/services/homepage.service.ts` (new) | Draft reads/writes, publish, discard, cached published read |
| `src/services/brand.service.ts`, `category.service.ts` | Revalidate the homepage tag on update/delete |
| `src/app/api/v1/admin/homepage/**/route.ts` (new, 6 files) | HTTP layer |
| `src/hooks/use-homepage.ts` (new) | Query + 6 mutations |
| `src/app/admin/storefront/homepage/page.tsx` (new) | Permission check, renders the builder |
| `src/app/admin/[...slug]/page.tsx` | Add route to `BUILT_ROUTES` |
| `src/components/admin/shared/row-actions.tsx` | `onDelete` becomes optional |
| `src/components/admin/homepage/*` (new, 5 files) | Builder, row, form modal, reference picker, input helper |
| `prisma/seed.ts` | Default homepage (draft + live, published) |
| `src/components/home/{hero,upcoming-drops,featured,conditions,stories,faq,invitation}/*` | Copy from props |
| `src/app/(site)/faq/page.tsx` | Unchanged call site; verify it still type-checks |
| `src/components/home/shared/section-header.tsx` (new) | Header + CTA shared by the three new sections |
| `src/components/home/{promo-banner,featured-brands,featured-categories}/*` (new) | New storefront sections |
| `src/components/home/homepage-section.tsx` (new) | `type → component` switch |
| `src/app/(site)/page.tsx` | Render published sections |
| `docs/HOMEPAGE-CMS.md` (new), `docs/ADMIN-PANEL.md`, `AGENTS.md` | Docs |

---

### Task 1: Schema and image references

**Files:**
- Create: `prisma/schema/homepage.prisma`
- Modify: `prisma/schema/media.prisma`
- Modify: `src/lib/storage/image-storage.ts:56-65`
- Modify: `src/services/media.service.ts:55-61`

**Interfaces:**
- Produces: Prisma models `homepageSection`, `homepageState`; `imageExists(tx, imageId): Promise<boolean>` in `media.service.ts`.

- [ ] **Step 1: Create the schema file**

`prisma/schema/homepage.prisma`:

```prisma
/// Which copy of the homepage a row belongs to. The console edits DRAFT;
/// shoppers see LIVE. Publish replaces LIVE with a copy of DRAFT, discard the
/// reverse — see docs/HOMEPAGE-CMS.md.
enum HomepageStage {
  DRAFT
  LIVE
}

/// Which fields each type carries is decided by `SECTION_RULES` in
/// `src/lib/homepage-sections.ts`, not here.
enum HomepageSectionType {
  HERO
  UPCOMING_DROPS
  BEST_SELLERS
  CONDITIONS
  TESTIMONIALS
  FAQ
  INVITATION
  PROMO_BANNER
  FEATURED_BRANDS
  FEATURED_CATEGORIES
}

model HomepageSection {
  id          String              @id @default(cuid())
  stage       HomepageStage
  type        HomepageSectionType
  sortOrder   Int
  visible     Boolean             @default(true)
  seasonal    Boolean             @default(false)
  eyebrow     String?
  /// A new line starts a new line of the heading.
  title       String?
  subtitle    String?
  description String?
  ctaLabel    String?
  ctaHref     String?

  /// A real relation, not an id inside JSON: the orphan sweep deletes any
  /// asset nothing references.
  imageId String?
  image   MediaAsset? @relation(fields: [imageId], references: [id], onDelete: SetNull)

  /// Brand or Category ids in display order. Ids that no longer exist are
  /// skipped when the section renders.
  refIds String[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([stage, sortOrder])
  @@map("homepage_sections")
}

/// A single row, id "homepage". Drives the console's "Unpublished changes".
model HomepageState {
  id             String    @id
  draftUpdatedAt DateTime
  publishedAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@map("homepage_state")
}
```

- [ ] **Step 2: Add the back-relation to `MediaAsset`**

In `prisma/schema/media.prisma`, below `brands     Brand[]`:

```prisma
  categories       Category[]
  brands           Brand[]
  homepageSections HomepageSection[]
```

(Realign the two existing lines as shown.)

- [ ] **Step 3: Count homepage sections as references in the orphan sweep**

In `src/lib/storage/image-storage.ts`, `sweepOrphans`:

```ts
  async sweepOrphans() {
    const { count } = await prisma.mediaAsset.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - ORPHAN_GRACE_MS) },
        categories: { none: {} },
        brands: { none: {} },
        homepageSections: { none: {} },
      },
    });
    return count;
  },
```

Also update the file's header comment line "Today the driver is Postgres: right for a few dozen category and brand images" to "category, brand and homepage images".

- [ ] **Step 4: Count them in `releaseImage` and add `imageExists`**

In `src/services/media.service.ts`, replace `releaseImage` and add `imageExists` below it:

```ts
export async function releaseImage(tx: Prisma.TransactionClient, imageId: string) {
  await tx.mediaAsset.deleteMany({
    where: {
      id: imageId,
      categories: { none: {} },
      brands: { none: {} },
      homepageSections: { none: {} },
    },
  });
}

/** Lets a service refuse a stale image id with a field error instead of a foreign-key 500. */
export async function imageExists(tx: Prisma.TransactionClient, imageId: string) {
  return (await tx.mediaAsset.count({ where: { id: imageId } })) > 0;
}
```

Update the file header comment "Both the category and the brand modal upload through here" to "The category, brand and homepage section modals all upload through here".

- [ ] **Step 5: STOP — owner runs the migration**

Tell the owner, verbatim:

> Schema is ready. Please run `npm run db:migrate -- --name add-homepage-sections` (this also regenerates the Prisma client), then tell me to continue.

Wait for confirmation. Every later task type-checks against the regenerated client.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 2: Rules, validator, types, permission, endpoints

**Files:**
- Create: `src/lib/homepage-sections.ts`
- Create: `src/validators/homepage.validator.ts`
- Create: `src/types/homepage.ts`
- Modify: `src/lib/auth/permissions.ts:26-32`
- Modify: `src/lib/api/api-endpoints.ts:13-27`

**Interfaces:**
- Produces (all from `@/lib/homepage-sections`): `HOMEPAGE_SECTION_TYPES`, `HomepageSectionType`, `ADDABLE_SECTION_TYPES`, `AddableSectionType`, `isAddableSectionType(type)`, `SECTION_TEXT_FIELDS`, `SectionTextField`, `SECTION_FIELD_LABELS`, `SECTION_TEXT_LIMITS`, `MAX_HOMEPAGE_SECTIONS` (30), `MAX_SECTION_REFS` (12), `HOMEPAGE_TAG` ("homepage"), `SECTION_RULES: Record<HomepageSectionType, SectionTypeRule>`, `sectionFields(type): SectionTextField[]`, `SectionFieldsInput`, `checkSectionFields(type, input): Record<string, string[]>`, `isSafeHref(href): boolean`, `headingLines(title): string[]`.
- Produces (validator): `homepageSectionSchema`, `createHomepageSectionSchema`, `reorderHomepageSchema`.
- Produces (types): `SectionRef`, `HomepageSection`, `HomepageDraft`, `HomepageSectionInput`, `CreateHomepageSectionInput`, `PublishedItem`, `PublishedSection`.
- Produces: `PERMISSIONS.homepage`; `API_ENDPOINTS.admin.homepage.{draft, sections, section(id), order, publish, discard}`.

- [ ] **Step 1: Write the rules module**

`src/lib/homepage-sections.ts`:

```ts
/**
 * Homepage section rules — which fields each section type carries, which it
 * requires, and which types staff may add. The console form and
 * `homepage.service.ts` both check input against this one table, so the two
 * cannot disagree about what a section may hold.
 *
 * Client-safe on purpose: no Prisma, no Next, no `server-only`. The console
 * form and `prisma/seed.ts` both import it.
 */

export const HOMEPAGE_SECTION_TYPES = [
  "HERO",
  "UPCOMING_DROPS",
  "BEST_SELLERS",
  "CONDITIONS",
  "TESTIMONIALS",
  "FAQ",
  "INVITATION",
  "PROMO_BANNER",
  "FEATURED_BRANDS",
  "FEATURED_CATEGORIES",
] as const;
export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

/** The types staff can add and delete. Everything else is part of the page. */
export const ADDABLE_SECTION_TYPES = [
  "PROMO_BANNER",
  "FEATURED_BRANDS",
  "FEATURED_CATEGORIES",
] as const satisfies readonly HomepageSectionType[];
export type AddableSectionType = (typeof ADDABLE_SECTION_TYPES)[number];

export function isAddableSectionType(type: HomepageSectionType): type is AddableSectionType {
  return (ADDABLE_SECTION_TYPES as readonly HomepageSectionType[]).includes(type);
}

export const SECTION_TEXT_FIELDS = [
  "eyebrow",
  "title",
  "subtitle",
  "description",
  "ctaLabel",
  "ctaHref",
] as const;
export type SectionTextField = (typeof SECTION_TEXT_FIELDS)[number];

export const SECTION_FIELD_LABELS: Record<SectionTextField, string> = {
  eyebrow: "Eyebrow",
  title: "Title",
  subtitle: "Subtitle",
  description: "Description",
  ctaLabel: "Button label",
  ctaHref: "Button link",
};

export const SECTION_TEXT_LIMITS: Record<SectionTextField, number> = {
  eyebrow: 60,
  title: 120,
  subtitle: 300,
  description: 600,
  ctaLabel: 40,
  ctaHref: 300,
};

/** Keeps the console's one list bounded — see docs/HOMEPAGE-CMS.md. */
export const MAX_HOMEPAGE_SECTIONS = 30;
export const MAX_SECTION_REFS = 12;

/** Cache tag for the storefront's published read. */
export const HOMEPAGE_TAG = "homepage";

export interface SectionTypeRule {
  label: string;
  /** Part of the page: can be moved and hidden, never added or deleted. */
  fixed: boolean;
  required: readonly SectionTextField[];
  optional: readonly SectionTextField[];
  image: boolean;
  seasonal: boolean;
  /** What `refIds` points at, or null when the type has no items to choose. */
  refs: "brands" | "categories" | null;
}

/**
 * A fixed type exposes exactly the slots its component had static copy in.
 * The Hero has no button; the Invitation's button opens the waitlist, so it
 * has a label and no link.
 */
export const SECTION_RULES: Record<HomepageSectionType, SectionTypeRule> = {
  HERO: {
    label: "Hero",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "description"],
    image: false,
    seasonal: false,
    refs: null,
  },
  UPCOMING_DROPS: {
    label: "Upcoming drops",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    seasonal: false,
    refs: null,
  },
  BEST_SELLERS: {
    label: "Best sellers",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    seasonal: false,
    refs: null,
  },
  CONDITIONS: {
    label: "Conditions",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle"],
    image: false,
    seasonal: false,
    refs: null,
  },
  TESTIMONIALS: {
    label: "Testimonials",
    fixed: true,
    required: ["title"],
    optional: ["subtitle"],
    image: false,
    seasonal: false,
    refs: null,
  },
  FAQ: {
    label: "FAQ",
    fixed: true,
    required: ["title"],
    optional: ["subtitle"],
    image: false,
    seasonal: false,
    refs: null,
  },
  INVITATION: {
    label: "Invitation",
    fixed: true,
    required: ["title", "ctaLabel"],
    optional: ["subtitle"],
    image: false,
    seasonal: false,
    refs: null,
  },
  PROMO_BANNER: {
    label: "Promo banner",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "description", "ctaLabel", "ctaHref"],
    image: true,
    seasonal: true,
    refs: null,
  },
  FEATURED_BRANDS: {
    label: "Featured brands",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    seasonal: false,
    refs: "brands",
  },
  FEATURED_CATEGORIES: {
    label: "Featured categories",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    seasonal: false,
    refs: "categories",
  },
};

/** The text fields `type` carries, in form order. */
export function sectionFields(type: HomepageSectionType): SectionTextField[] {
  const rule = SECTION_RULES[type];
  return SECTION_TEXT_FIELDS.filter(
    (field) => rule.required.includes(field) || rule.optional.includes(field),
  );
}

export interface SectionFieldsInput {
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageId: string | null;
  seasonal: boolean;
  refIds: string[];
}

/**
 * Field errors for `input` under `type`'s rules — empty when it is valid.
 * Fields a type does not carry are refused, not silently dropped, so a
 * client that sends them learns so.
 */
export function checkSectionFields(
  type: HomepageSectionType,
  input: SectionFieldsInput,
): Record<string, string[]> {
  const rule = SECTION_RULES[type];
  const allowed = sectionFields(type);
  const errors: Record<string, string[]> = {};
  const add = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };
  const noun = rule.label.toLowerCase();

  for (const field of SECTION_TEXT_FIELDS) {
    const label = SECTION_FIELD_LABELS[field].toLowerCase();
    if (rule.required.includes(field) && !input[field]) {
      add(field, `Enter a ${label}.`);
    } else if (!allowed.includes(field) && input[field]) {
      add(field, `A ${noun} section has no ${label}.`);
    }
  }

  const hasLink = allowed.includes("ctaLabel") && allowed.includes("ctaHref");
  if (hasLink && Boolean(input.ctaLabel) !== Boolean(input.ctaHref)) {
    add(input.ctaLabel ? "ctaHref" : "ctaLabel", "Fill in both the button label and link, or neither.");
  }

  if (!rule.image && input.imageId) add("imageId", `A ${noun} section has no image.`);
  if (!rule.seasonal && input.seasonal) add("seasonal", `A ${noun} section can't be marked seasonal.`);

  if (rule.refs === null && input.refIds.length > 0) {
    add("refIds", `A ${noun} section has no items to choose.`);
  } else if (rule.refs !== null && input.refIds.length === 0) {
    add("refIds", rule.refs === "brands" ? "Choose at least one brand." : "Choose at least one category.");
  }

  return errors;
}

/**
 * Site paths (`/collection`) and https links. Not `//host` or `/\host`, which
 * browsers resolve as absolute — the same hole the rich-text link rule closes.
 */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//") && !href.startsWith("/\\");
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

/** A stored title split into the heading's lines. */
export function headingLines(title: string): string[] {
  return title
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
```

- [ ] **Step 2: Write the validator**

`src/validators/homepage.validator.ts`:

```ts
import { z } from "zod";
import {
  ADDABLE_SECTION_TYPES,
  MAX_HOMEPAGE_SECTIONS,
  MAX_SECTION_REFS,
  SECTION_TEXT_LIMITS,
  isSafeHref,
  type SectionTextField,
} from "@/lib/homepage-sections";
import { idValidator } from "./common/primitives.validator";

/**
 * The shape every section body shares. Which fields a given type may fill is
 * checked afterwards by `checkSectionFields`, because an update's type comes
 * from the stored row, not from the body.
 */

/** Trimmed; an empty string is stored as null. */
function optionalText(field: SectionTextField) {
  const max = SECTION_TEXT_LIMITS[field];
  return z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .nullable()
    .default(null)
    .transform((value) => value || null);
}

export const homepageSectionSchema = z.object({
  eyebrow: optionalText("eyebrow"),
  title: optionalText("title"),
  subtitle: optionalText("subtitle"),
  description: optionalText("description"),
  ctaLabel: optionalText("ctaLabel"),
  ctaHref: optionalText("ctaHref").refine(
    (value) => value === null || isSafeHref(value),
    "Use a site path such as /collection, or an https:// link.",
  ),
  imageId: idValidator.nullable().default(null),
  seasonal: z.boolean().default(false),
  visible: z.boolean().default(true),
  refIds: z
    .array(idValidator)
    .max(MAX_SECTION_REFS, `Choose ${MAX_SECTION_REFS} or fewer.`)
    .refine((ids) => new Set(ids).size === ids.length, "Each item can only be chosen once.")
    .default([]),
});

export const createHomepageSectionSchema = homepageSectionSchema.extend({
  type: z.enum(ADDABLE_SECTION_TYPES, { error: "Choose a section type." }),
});

export const reorderHomepageSchema = z.object({
  ids: z.array(idValidator).min(1).max(MAX_HOMEPAGE_SECTIONS),
});
```

- [ ] **Step 3: Write the types**

`src/types/homepage.ts`:

```ts
import type { z } from "zod";
import type { HomepageSectionType } from "@/lib/homepage-sections";
import type {
  createHomepageSectionSchema,
  homepageSectionSchema,
} from "@/validators/homepage.validator";

export interface SectionRef {
  id: string;
  name: string;
}

/** A draft section as the console edits it. */
export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  visible: boolean;
  seasonal: boolean;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  /** Submitted back unchanged when the modal leaves the image alone. */
  imageId: string | null;
  /** `/api/v1/media/<id>`, or null. */
  imageUrl: string | null;
  /** Chosen brands or categories that still exist, in display order. */
  refs: SectionRef[];
  /** ISO string. */
  updatedAt: string;
}

export interface HomepageDraft {
  sections: HomepageSection[];
  hasUnpublishedChanges: boolean;
  /** ISO string, or null when the homepage has never been published. */
  publishedAt: string | null;
}

export type HomepageSectionInput = z.input<typeof homepageSectionSchema>;
export type CreateHomepageSectionInput = z.input<typeof createHomepageSectionSchema>;

/** A brand or category inside a live featured section. */
export interface PublishedItem {
  id: string;
  name: string;
  imageUrl: string | null;
  href: string;
}

/** A visible live section, ready for the storefront. */
export interface PublishedSection {
  id: string;
  type: HomepageSectionType;
  seasonal: boolean;
  eyebrow: string | null;
  /** Required by every type, so never null once published. */
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  items: PublishedItem[];
}
```

- [ ] **Step 4: Add the permission**

In `src/lib/auth/permissions.ts`, extend `PERMISSIONS`:

```ts
export const PERMISSIONS = {
  content: adminPermission("storefront", "content"),
  homepage: adminPermission("storefront", "homepage"),
  /** Covers both Users screens — staff accounts and customer accounts. */
  users: adminPermission("service", "users"),
  categories: adminPermission("catalogue", "categories"),
  brands: adminPermission("catalogue", "brands"),
} as const;
```

- [ ] **Step 5: Add the endpoints**

In `src/lib/api/api-endpoints.ts`, inside `admin`, after `brands`:

```ts
    homepage: {
      draft: `${V1}/admin/homepage`,
      sections: `${V1}/admin/homepage/sections`,
      section: (id: string) => `${V1}/admin/homepage/sections/${id}`,
      order: `${V1}/admin/homepage/order`,
      publish: `${V1}/admin/homepage/publish`,
      discard: `${V1}/admin/homepage/discard`,
    },
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no errors.

---

### Task 3: Homepage service (+ brand/category revalidation)

**Files:**
- Create: `src/services/homepage.service.ts`
- Modify: `src/services/brand.service.ts` (`updateBrand`, `deleteBrand`)
- Modify: `src/services/category.service.ts` (`updateCategory`, `deleteCategory`)

**Interfaces:**
- Consumes: Task 1 models, `releaseImage`, `imageExists`; Task 2 rules, schemas, types.
- Produces: `getHomepageDraft(): Promise<HomepageDraftResult>`, `addHomepageSection(data)`, `updateHomepageSection(id, data)`, `deleteHomepageSection(id)`, `reorderHomepageSections(ids)`, `publishHomepage()`, `discardHomepageDraft()` — every write returns the refreshed draft (same shape as `getHomepageDraft`). `getPublishedHomepage(): Promise<PublishedSection[]>`.

- [ ] **Step 1: Write the service**

`src/services/homepage.service.ts`:

```ts
import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import {
  HOMEPAGE_TAG,
  MAX_HOMEPAGE_SECTIONS,
  SECTION_RULES,
  checkSectionFields,
  type HomepageSectionType,
} from "@/lib/homepage-sections";
import { SHOP_INDEX_HREF, productHrefForCategory } from "@/lib/route-map";
import { resolveCategory } from "@/lib/shop";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import type { PublishedSection } from "@/types/homepage";
import type {
  createHomepageSectionSchema,
  homepageSectionSchema,
} from "@/validators/homepage.validator";
import { imageExists, releaseImage } from "./media.service";

/**
 * The homepage as rows. Every section exists twice: DRAFT, which the console
 * edits, and LIVE, which the storefront reads. Publish replaces LIVE with a
 * copy of DRAFT and discard does the reverse, each in one transaction, so a
 * half-finished arrangement never reaches shoppers.
 *
 * Only DRAFT rows are ever addressed by id. A LIVE id answers 404.
 */

type Tx = Prisma.TransactionClient;
type Stage = "DRAFT" | "LIVE";
type SectionData = z.output<typeof homepageSectionSchema>;
type CreateSectionData = z.output<typeof createHomepageSectionSchema>;

const STATE_ID = "homepage";

const sectionSelect = {
  id: true,
  type: true,
  sortOrder: true,
  visible: true,
  seasonal: true,
  eyebrow: true,
  title: true,
  subtitle: true,
  description: true,
  ctaLabel: true,
  ctaHref: true,
  imageId: true,
  refIds: true,
  updatedAt: true,
} satisfies Prisma.HomepageSectionSelect;

type SectionRow = Prisma.HomepageSectionGetPayload<{ select: typeof sectionSelect }>;

interface RefRow {
  id: string;
  name: string;
  imageId: string | null;
}

const refSelect = { id: true, name: true, imageId: true } as const;

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that section. It may have been deleted.", 404);

/* ---------- console reads ---------- */

export async function getHomepageDraft() {
  const [rows, state] = await prisma.$transaction([
    prisma.homepageSection.findMany({
      where: { stage: "DRAFT" },
      select: sectionSelect,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.homepageState.findUnique({ where: { id: STATE_ID } }),
  ]);
  const refs = await loadRefs(rows);

  return {
    sections: rows.map((row) => ({
      id: row.id,
      type: row.type,
      visible: row.visible,
      seasonal: row.seasonal,
      eyebrow: row.eyebrow,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      ctaLabel: row.ctaLabel,
      ctaHref: row.ctaHref,
      imageId: row.imageId,
      imageUrl: imageUrlOrNull(row.imageId),
      refs: refsOf(row, refs).map(({ id, name }) => ({ id, name })),
      updatedAt: row.updatedAt,
    })),
    hasUnpublishedChanges:
      state === null
        ? rows.length > 0
        : state.publishedAt === null || state.draftUpdatedAt > state.publishedAt,
    publishedAt: state?.publishedAt ?? null,
  };
}

/* ---------- draft writes ---------- */

export async function addHomepageSection(data: CreateSectionData) {
  await prisma.$transaction(async (tx) => {
    const count = await tx.homepageSection.count({ where: { stage: "DRAFT" } });
    if (count >= MAX_HOMEPAGE_SECTIONS) {
      throw new ServiceError(
        "CONFLICT",
        `The homepage holds up to ${MAX_HOMEPAGE_SECTIONS} sections. Delete one before adding another.`,
        409,
      );
    }

    await assertSectionValid(tx, data.type, data);

    const last = await tx.homepageSection.findFirst({
      where: { stage: "DRAFT" },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    await tx.homepageSection.create({
      data: {
        ...columnsOf(data),
        stage: "DRAFT",
        type: data.type,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

export async function updateHomepageSection(id: string, data: SectionData) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.homepageSection.findFirst({
      where: { id, stage: "DRAFT" },
      select: { type: true, imageId: true },
    });
    if (!current) throw notFound();

    await assertSectionValid(tx, current.type, data);
    await tx.homepageSection.update({ where: { id }, data: columnsOf(data) });

    // The LIVE copy may still point at the old image; releaseImage keeps it
    // while any row of either stage does.
    if (current.imageId !== null && current.imageId !== data.imageId) {
      await releaseImage(tx, current.imageId);
    }
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

export async function deleteHomepageSection(id: string) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.homepageSection.findFirst({
      where: { id, stage: "DRAFT" },
      select: { type: true, imageId: true },
    });
    if (!current) throw notFound();

    if (SECTION_RULES[current.type].fixed) {
      throw new ServiceError(
        "CONFLICT",
        "This section is part of the page and can't be deleted. Hide it instead.",
        409,
      );
    }

    await tx.homepageSection.delete({ where: { id } });
    if (current.imageId !== null) await releaseImage(tx, current.imageId);
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

/** `ids` must be exactly the draft's ids, each once, in the new order. */
export async function reorderHomepageSections(ids: string[]) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.homepageSection.findMany({
      where: { stage: "DRAFT" },
      select: { id: true },
    });
    const current = new Set(rows.map((row) => row.id));

    const matches =
      new Set(ids).size === ids.length &&
      ids.length === current.size &&
      ids.every((id) => current.has(id));
    if (!matches) {
      throw new ServiceError(
        "VALIDATION",
        "The page changed since you loaded it. Reload and try again.",
        422,
      );
    }

    for (const [index, id] of ids.entries()) {
      await tx.homepageSection.update({ where: { id }, data: { sortOrder: index } });
    }
    await touchDraft(tx);
  });

  return getHomepageDraft();
}

/* ---------- publishing ---------- */

export async function publishHomepage() {
  await prisma.$transaction(async (tx) => {
    const draft = await tx.homepageSection.findMany({
      where: { stage: "DRAFT" },
      select: sectionSelect,
      orderBy: { sortOrder: "asc" },
    });
    if (draft.length === 0) {
      throw new ServiceError(
        "CONFLICT",
        "There's nothing to publish. The draft has no sections.",
        409,
      );
    }

    const oldLive = await tx.homepageSection.findMany({
      where: { stage: "LIVE" },
      select: { imageId: true },
    });

    await tx.homepageSection.deleteMany({ where: { stage: "LIVE" } });
    await tx.homepageSection.createMany({ data: draft.map((row) => copyAs(row, "LIVE")) });
    // After the copy, so an image both versions share is still referenced.
    await releaseImages(tx, oldLive);

    const now = new Date();
    await tx.homepageState.upsert({
      where: { id: STATE_ID },
      create: { id: STATE_ID, draftUpdatedAt: now, publishedAt: now },
      update: { publishedAt: now },
    });
  });

  revalidateTag(HOMEPAGE_TAG);
  revalidatePath("/");
  return getHomepageDraft();
}

export async function discardHomepageDraft() {
  await prisma.$transaction(async (tx) => {
    const state = await tx.homepageState.findUnique({ where: { id: STATE_ID } });
    if (!state?.publishedAt) {
      throw new ServiceError(
        "CONFLICT",
        "Nothing has been published yet, so there's no live version to go back to.",
        409,
      );
    }

    const live = await tx.homepageSection.findMany({
      where: { stage: "LIVE" },
      select: sectionSelect,
      orderBy: { sortOrder: "asc" },
    });
    const oldDraft = await tx.homepageSection.findMany({
      where: { stage: "DRAFT" },
      select: { imageId: true },
    });

    await tx.homepageSection.deleteMany({ where: { stage: "DRAFT" } });
    await tx.homepageSection.createMany({ data: live.map((row) => copyAs(row, "DRAFT")) });
    await releaseImages(tx, oldDraft);

    // The draft now equals what is live, so there is nothing unpublished.
    await tx.homepageState.update({
      where: { id: STATE_ID },
      data: { draftUpdatedAt: state.publishedAt },
    });
  });

  return getHomepageDraft();
}

/* ---------- storefront ---------- */

async function readPublishedHomepage(): Promise<PublishedSection[]> {
  const rows = await prisma.homepageSection.findMany({
    where: { stage: "LIVE", visible: true },
    select: sectionSelect,
    orderBy: { sortOrder: "asc" },
  });
  const refs = await loadRefs(rows);

  return rows.flatMap((row) => {
    const kind = SECTION_RULES[row.type].refs;
    const items = refsOf(row, refs).map((ref) => ({
      id: ref.id,
      name: ref.name,
      imageUrl: imageUrlOrNull(ref.imageId),
      href: kind === "brands" ? brandHref(ref.name) : categoryHref(ref.name),
    }));

    // Every chosen brand deleted, or a title missing from a hand-edited row:
    // render nothing rather than empty chrome.
    if ((kind !== null && items.length === 0) || !row.title) return [];

    return [
      {
        id: row.id,
        type: row.type,
        seasonal: row.seasonal,
        eyebrow: row.eyebrow,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        ctaLabel: row.ctaLabel,
        ctaHref: row.ctaHref,
        imageUrl: imageUrlOrNull(row.imageId),
        items,
      },
    ];
  });
}

/** Visible live sections in order. Cached; publish and brand/category edits revalidate it. */
export function getPublishedHomepage(): Promise<PublishedSection[]> {
  return unstable_cache(readPublishedHomepage, ["homepage", "published"], {
    tags: [HOMEPAGE_TAG],
  })();
}

/*
 * Item links are best effort until P2 owns listing routes. The shop filters
 * by brand *name* and silently ignores names it doesn't know, so a brand link
 * never 404s. `/collection/<slug>` does 404 for an unknown category, so a
 * category links there only when the shop recognises it.
 */
function brandHref(name: string) {
  return `${SHOP_INDEX_HREF}?brand=${encodeURIComponent(name)}`;
}

function categoryHref(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const known = resolveCategory(slug);
  return known ? productHrefForCategory(known) : SHOP_INDEX_HREF;
}

/* ---------- rules ---------- */

async function assertSectionValid(tx: Tx, type: HomepageSectionType, data: SectionData) {
  const errors = checkSectionFields(type, data);
  if (Object.keys(errors).length > 0) {
    throw new ServiceError("VALIDATION", "Please check the highlighted fields.", 422, errors);
  }

  const kind = SECTION_RULES[type].refs;
  if (kind !== null) {
    const where = { id: { in: data.refIds } };
    const found =
      kind === "brands" ? await tx.brand.count({ where }) : await tx.category.count({ where });
    if (found !== data.refIds.length) {
      const message =
        kind === "brands"
          ? "One of the chosen brands no longer exists. Remove it and try again."
          : "One of the chosen categories no longer exists. Remove it and try again.";
      throw new ServiceError("VALIDATION", message, 422, { refIds: [message] });
    }
  }

  if (data.imageId !== null && !(await imageExists(tx, data.imageId))) {
    const message = "That image no longer exists. Upload it again.";
    throw new ServiceError("VALIDATION", message, 422, { imageId: [message] });
  }
}

/* ---------- helpers ---------- */

function columnsOf(data: SectionData) {
  return {
    visible: data.visible,
    seasonal: data.seasonal,
    eyebrow: data.eyebrow,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    ctaLabel: data.ctaLabel,
    ctaHref: data.ctaHref,
    imageId: data.imageId,
    refIds: data.refIds,
  };
}

function copyAs(row: SectionRow, stage: Stage): Prisma.HomepageSectionCreateManyInput {
  return {
    stage,
    type: row.type,
    sortOrder: row.sortOrder,
    visible: row.visible,
    seasonal: row.seasonal,
    eyebrow: row.eyebrow,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    imageId: row.imageId,
    refIds: row.refIds,
  };
}

async function releaseImages(tx: Tx, rows: { imageId: string | null }[]) {
  const ids = new Set(rows.flatMap((row) => (row.imageId === null ? [] : [row.imageId])));
  for (const id of ids) await releaseImage(tx, id);
}

async function touchDraft(tx: Tx) {
  const now = new Date();
  await tx.homepageState.upsert({
    where: { id: STATE_ID },
    create: { id: STATE_ID, draftUpdatedAt: now },
    update: { draftUpdatedAt: now },
  });
}

/** Every brand and category the rows point at, fetched once per kind. */
async function loadRefs(rows: Pick<SectionRow, "type" | "refIds">[]) {
  const idsFor = (kind: "brands" | "categories") =>
    rows.filter((row) => SECTION_RULES[row.type].refs === kind).flatMap((row) => row.refIds);

  const brandIds = idsFor("brands");
  const categoryIds = idsFor("categories");

  const [brands, categories] = await Promise.all([
    brandIds.length > 0
      ? prisma.brand.findMany({ where: { id: { in: brandIds } }, select: refSelect })
      : Promise.resolve([] as RefRow[]),
    categoryIds.length > 0
      ? prisma.category.findMany({ where: { id: { in: categoryIds } }, select: refSelect })
      : Promise.resolve([] as RefRow[]),
  ]);

  return {
    brands: new Map(brands.map((row) => [row.id, row])),
    categories: new Map(categories.map((row) => [row.id, row])),
  };
}

/** A row's refs that still exist, in its stored order. */
function refsOf(
  row: Pick<SectionRow, "type" | "refIds">,
  refs: Awaited<ReturnType<typeof loadRefs>>,
): RefRow[] {
  const kind = SECTION_RULES[row.type].refs;
  if (kind === null) return [];
  const table = refs[kind];
  return row.refIds.flatMap((id) => table.get(id) ?? []);
}
```

- [ ] **Step 2: Revalidate the homepage from the brand service**

In `src/services/brand.service.ts` add imports:

```ts
import { revalidateTag } from "next/cache";
import { HOMEPAGE_TAG } from "@/lib/homepage-sections";
```

In `updateBrand`, between the transaction and `return getBrand(id);`:

```ts
  // A featured brand's name and logo are read by the cached homepage.
  revalidateTag(HOMEPAGE_TAG);
```

In `deleteBrand`, between the transaction and `return { id };`:

```ts
  revalidateTag(HOMEPAGE_TAG);
```

- [ ] **Step 3: Same in the category service**

In `src/services/category.service.ts` add the same two imports, and the same `revalidateTag(HOMEPAGE_TAG);` after the transaction in `updateCategory` (with the comment, "category" in place of "brand") and in `deleteCategory`.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no errors. If `resolveCategory`'s return type isn't accepted by `productHrefForCategory(categorySlug: string)`, it is — `CategorySlug` is a string union.

---

### Task 4: API routes

**Files:**
- Create: `src/app/api/v1/admin/homepage/route.ts`
- Create: `src/app/api/v1/admin/homepage/sections/route.ts`
- Create: `src/app/api/v1/admin/homepage/sections/[id]/route.ts`
- Create: `src/app/api/v1/admin/homepage/order/route.ts`
- Create: `src/app/api/v1/admin/homepage/publish/route.ts`
- Create: `src/app/api/v1/admin/homepage/discard/route.ts`

**Interfaces:**
- Consumes: Task 3 service functions; Task 2 schemas; `PERMISSIONS.homepage`.
- Produces: `GET /api/v1/admin/homepage`, `POST …/sections`, `PUT|DELETE …/sections/[id]`, `PUT …/order`, `POST …/publish`, `POST …/discard` — every one returns `HomepageDraft` in the envelope.

- [ ] **Step 1: Draft read**

`src/app/api/v1/admin/homepage/route.ts`:

```ts
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { getHomepageDraft } from "@/services/homepage.service";

/** One bounded list (at most MAX_HOMEPAGE_SECTIONS), so not paginated — see docs/HOMEPAGE-CMS.md. */
export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getHomepageDraft());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/homepage");
  }
}
```

- [ ] **Step 2: Add a section**

`src/app/api/v1/admin/homepage/sections/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { addHomepageSection } from "@/services/homepage.service";
import { createHomepageSectionSchema } from "@/validators/homepage.validator";

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  const input = createHomepageSectionSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    return apiSuccess(await addHomepageSection(input.data), 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/homepage/sections");
  }
}
```

- [ ] **Step 3: Update and delete one section**

`src/app/api/v1/admin/homepage/sections/[id]/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { deleteHomepageSection, updateHomepageSection } from "@/services/homepage.service";
import { homepageSectionSchema } from "@/validators/homepage.validator";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  const input = homepageSectionSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  const { id } = await params;
  try {
    return apiSuccess(await updateHomepageSection(id, input.data));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/homepage/sections/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await deleteHomepageSection(id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/homepage/sections/[id]");
  }
}
```

- [ ] **Step 4: Reorder**

`src/app/api/v1/admin/homepage/order/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { reorderHomepageSections } from "@/services/homepage.service";
import { reorderHomepageSchema } from "@/validators/homepage.validator";

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  const input = reorderHomepageSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Invalid order.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await reorderHomepageSections(input.data.ids));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/homepage/order");
  }
}
```

- [ ] **Step 5: Publish and discard**

`src/app/api/v1/admin/homepage/publish/route.ts`:

```ts
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { publishHomepage } from "@/services/homepage.service";

export async function POST() {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await publishHomepage());
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/homepage/publish");
  }
}
```

`src/app/api/v1/admin/homepage/discard/route.ts`:

```ts
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { discardHomepageDraft } from "@/services/homepage.service";

export async function POST() {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await discardHomepageDraft());
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/homepage/discard");
  }
}
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no errors.

---

### Task 5: Hooks and the console screen

**Files:**
- Create: `src/hooks/use-homepage.ts`
- Create: `src/app/admin/storefront/homepage/page.tsx`
- Modify: `src/app/admin/[...slug]/page.tsx` (`BUILT_ROUTES`)
- Modify: `src/components/admin/shared/row-actions.tsx` (`onDelete` optional)
- Create: `src/components/admin/homepage/section-input.ts`
- Create: `src/components/admin/homepage/homepage-builder.tsx`
- Create: `src/components/admin/homepage/section-row.tsx`
- Create: `src/components/admin/homepage/section-form-modal.tsx`
- Create: `src/components/admin/homepage/reference-picker.tsx`

**Interfaces:**
- Consumes: Task 2 rules/types/endpoints; Task 4 routes; `useGetBrands`, `useGetCategories`, `ImageField`, `ConfirmDialog`, `Dialog`, `Field`, `Input`, `Textarea`, `Select`, `Badge`, `Button`, `Skeleton`, `AdminPage`, `AdminEmptyState`, `RowActions`.
- Produces: `useGetHomepageDraft`, `useAddHomepageSection`, `useUpdateHomepageSection`, `useDeleteHomepageSection`, `useReorderHomepageSections`, `usePublishHomepage`, `useDiscardHomepageDraft`; `<HomepageBuilder />`.

- [ ] **Step 1: Hooks**

`src/hooks/use-homepage.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import type {
  CreateHomepageSectionInput,
  HomepageDraft,
  HomepageSectionInput,
} from "@/types/homepage";

const homepageKeys = {
  all: ["homepage"] as const,
  draft: ["homepage", "draft"] as const,
};

const endpoints = API_ENDPOINTS.admin.homepage;

/* ---------- queries ---------- */

export function useGetHomepageDraft() {
  return useQuery({
    queryKey: homepageKeys.draft,
    queryFn: ({ signal }) => apiRequest<HomepageDraft>(endpoints.draft, { signal }),
  });
}

/* ---------- mutations ---------- */

export function useAddHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHomepageSectionInput) =>
      apiRequest<HomepageDraft>(endpoints.sections, { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homepageKeys.all }),
  });
}

export function useUpdateHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: HomepageSectionInput & { id: string }) =>
      apiRequest<HomepageDraft>(endpoints.section(id), { method: "PUT", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homepageKeys.all }),
  });
}

export function useDeleteHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<HomepageDraft>(endpoints.section(id), { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homepageKeys.all }),
  });
}

export function useReorderHomepageSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiRequest<HomepageDraft>(endpoints.order, { method: "PUT", body: { ids } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homepageKeys.all }),
  });
}

export function usePublishHomepage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<HomepageDraft>(endpoints.publish, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homepageKeys.all }),
  });
}

export function useDiscardHomepageDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<HomepageDraft>(endpoints.discard, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homepageKeys.all }),
  });
}
```

- [ ] **Step 2: Route page and `BUILT_ROUTES`**

`src/app/admin/storefront/homepage/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { HomepageBuilder } from "@/components/admin/homepage/homepage-builder";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Homepage Builder" };

export default async function HomepageBuilderPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (!hasPermission(session.user.role, PERMISSIONS.homepage)) {
    return (
      <AdminPage title="Homepage Builder">
        <AdminEmptyState
          title="Access denied"
          description="Your role doesn't include the Homepage Builder."
        />
      </AdminPage>
    );
  }

  return <HomepageBuilder />;
}
```

In `src/app/admin/[...slug]/page.tsx`, add `"/admin/storefront/homepage",` to `BUILT_ROUTES` after `"/admin/storefront/content",`.

- [ ] **Step 3: Make `RowActions`' delete optional**

In `src/components/admin/shared/row-actions.tsx`, change the props type to `onDelete?: () => void;` (with the comment `/** Absent for rows that can't be deleted. */`) and wrap the delete button:

```tsx
      {onDelete && (
        <IconButton label={`Delete ${name}`} onClick={onDelete} disabled={disabled}>
          <path d="M4 7h16" />
          <path d="M9 7V4.5h6V7" />
          <path d="M6.5 7l1 12.5h9l1-12.5" />
        </IconButton>
      )}
```

Update the file's header comment "the edit/delete pair" → "edit and, where the row allows it, delete".

- [ ] **Step 4: Section → request body helper**

`src/components/admin/homepage/section-input.ts`:

```ts
import type { HomepageSection, HomepageSectionInput } from "@/types/homepage";

/** A stored section as the body PUT expects — what the visibility switch re-sends. */
export function sectionInputOf(section: HomepageSection): HomepageSectionInput {
  return {
    eyebrow: section.eyebrow,
    title: section.title,
    subtitle: section.subtitle,
    description: section.description,
    ctaLabel: section.ctaLabel,
    ctaHref: section.ctaHref,
    imageId: section.imageId,
    seasonal: section.seasonal,
    visible: section.visible,
    refIds: section.refs.map((ref) => ref.id),
  };
}
```

- [ ] **Step 5: Section row**

`src/components/admin/homepage/section-row.tsx`:

```tsx
"use client";

import { Reorder, useDragControls } from "framer-motion";
import { RowActions } from "@/components/admin/shared/row-actions";
import { SECTION_RULES, headingLines } from "@/lib/homepage-sections";
import { cn } from "@/lib/utils";
import type { HomepageSection } from "@/types/homepage";

/**
 * One section in the builder. Dragging starts only from the handle, as in the
 * policy editor, so selecting text in the row never starts a drag.
 */
export function SectionRow({
  section,
  busy,
  onEdit,
  onToggleVisible,
  onDelete,
  onDragEnd,
}: {
  section: HomepageSection;
  busy: boolean;
  onEdit: () => void;
  onToggleVisible: () => void;
  /** Absent for fixed sections. */
  onDelete?: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const rule = SECTION_RULES[section.type];
  const name = headingLines(section.title ?? "").join(" ") || rule.label;

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-4 border-b border-line bg-surface px-5 py-4 last:border-b-0",
        busy && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${name}`}
        onPointerDown={(event) => controls.start(event)}
        className="cursor-grab touch-none rounded p-1 text-ink-muted transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
          <circle cx="9" cy="6" r="1.25" />
          <circle cx="15" cy="6" r="1.25" />
          <circle cx="9" cy="12" r="1.25" />
          <circle cx="15" cy="12" r="1.25" />
          <circle cx="9" cy="18" r="1.25" />
          <circle cx="15" cy="18" r="1.25" />
        </svg>
      </button>

      <div className={cn("min-w-0 flex-1", !section.visible && "opacity-60")}>
        <p className="eyebrow">
          {rule.label}
          {section.seasonal && " · Seasonal"}
          {rule.refs && ` · ${section.refs.length} ${rule.refs}`}
        </p>
        <p className="mt-1 truncate text-sm font-medium text-ink">{name}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={section.visible}
        aria-label={`Show ${name} on the homepage`}
        disabled={busy}
        onClick={onToggleVisible}
        className={cn(
          "rounded-full border px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em]",
          "transition-colors duration-(--duration-fast) disabled:opacity-40",
          section.visible
            ? "border-accent/25 bg-accent/10 text-accent"
            : "border-line text-ink-muted hover:text-ink",
        )}
      >
        {section.visible ? "Visible" : "Hidden"}
      </button>

      <RowActions name={name} disabled={busy} onEdit={onEdit} onDelete={onDelete} />
    </Reorder.Item>
  );
}
```

- [ ] **Step 6: Reference picker**

`src/components/admin/homepage/reference-picker.tsx`:

```tsx
"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBrands } from "@/hooks/use-brand";
import { useGetCategories } from "@/hooks/use-category";
import { MAX_SECTION_REFS } from "@/lib/homepage-sections";
import type { SectionRef } from "@/types/homepage";

/**
 * Chooses the brands or categories a featured section shows, in order.
 * Search runs against the existing admin list endpoints, so this adds no API.
 */

interface Option extends SectionRef {
  /** What the list shows. A child category carries its parent's name. */
  label: string;
}

interface OptionsQuery {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => unknown;
}

export function ReferencePicker({
  kind,
  value,
  onChange,
  error,
}: {
  kind: "brands" | "categories";
  value: SectionRef[];
  onChange: (next: SectionRef[]) => void;
  error?: string;
}) {
  const id = useId();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const noun = kind === "brands" ? "brands" : "categories";
  const full = value.length >= MAX_SECTION_REFS;

  // Search once typing pauses.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  function pick(option: SectionRef) {
    if (full || value.some((ref) => ref.id === option.id)) return;
    onChange([...value, { id: option.id, name: option.name }]);
  }

  function move(index: number, by: -1 | 1) {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  }

  const optionProps = { search, chosen: value, disabled: full, onPick: pick };

  return (
    <div className="grid gap-3">
      <Label htmlFor={`${id}-search`}>
        {kind === "brands" ? "Brands" : "Categories"} ({value.length}/{MAX_SECTION_REFS})
      </Label>

      {value.length > 0 && (
        <ol className="overflow-hidden rounded-md border border-line">
          {value.map((ref, index) => (
            <li
              key={ref.id}
              className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0"
            >
              <span className="w-6 font-mono text-xs tabular-nums text-ink-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{ref.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={index === 0}
                aria-label={`Move ${ref.name} up`}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={index === value.length - 1}
                aria-label={`Move ${ref.name} down`}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                aria-label={`Remove ${ref.name}`}
                onClick={() => onChange(value.filter((other) => other.id !== ref.id))}
              >
                ×
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Input
        id={`${id}-search`}
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder={`Search ${noun}`}
        className="h-10"
      />

      {kind === "brands" ? <BrandOptions {...optionProps} /> : <CategoryOptions {...optionProps} />}

      {full && (
        <p className="text-xs text-ink-muted">
          A section shows up to {MAX_SECTION_REFS} {noun}. Remove one to add another.
        </p>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

interface OptionsProps {
  search: string;
  chosen: SectionRef[];
  disabled: boolean;
  onPick: (option: SectionRef) => void;
}

function BrandOptions({ search, ...rest }: OptionsProps) {
  const brands = useGetBrands({ search: search || undefined, pageSize: 20 });
  const options = brands.data?.items.map((brand) => ({
    id: brand.id,
    name: brand.name,
    label: brand.name,
  }));
  return <OptionList query={brands} options={options} {...rest} />;
}

function CategoryOptions({ search, ...rest }: OptionsProps) {
  const categories = useGetCategories({ search: search || undefined, pageSize: 20 });
  const options = categories.data?.items.flatMap((parent) => [
    { id: parent.id, name: parent.name, label: parent.name },
    ...parent.children.map((child) => ({
      id: child.id,
      name: child.name,
      label: `${parent.name} › ${child.name}`,
    })),
  ]);
  return <OptionList query={categories} options={options} {...rest} />;
}

function OptionList({
  query,
  options,
  chosen,
  disabled,
  onPick,
}: Omit<OptionsProps, "search"> & { query: OptionsQuery; options: Option[] | undefined }) {
  if (query.isPending) {
    return (
      <div aria-busy className="grid gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm text-danger">
        {query.error?.message}
        <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!options || options.length === 0) {
    return <p className="text-sm text-ink-muted">Nothing matches.</p>;
  }

  const chosenIds = new Set(chosen.map((ref) => ref.id));

  return (
    <ul className="max-h-48 overflow-y-auto rounded-md border border-line" data-lenis-prevent>
      {options.map((option) => {
        const added = chosenIds.has(option.id);
        return (
          <li key={option.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              disabled={added || disabled}
              onClick={() => onPick(option)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink transition-colors duration-(--duration-fast) hover:bg-surface-2 disabled:text-ink-muted disabled:hover:bg-transparent"
            >
              <span className="truncate">{option.label}</span>
              {added && <span className="text-xs">Added</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 7: Section form modal**

`src/components/admin/homepage/section-form-modal.tsx`:

```tsx
"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { ImageField } from "@/components/admin/shared/image-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAddHomepageSection, useUpdateHomepageSection } from "@/hooks/use-homepage";
import { apiFieldErrors } from "@/lib/api/api-client";
import {
  ADDABLE_SECTION_TYPES,
  SECTION_FIELD_LABELS,
  SECTION_RULES,
  SECTION_TEXT_FIELDS,
  checkSectionFields,
  isAddableSectionType,
  sectionFields,
  type HomepageSectionType,
  type SectionTextField,
} from "@/lib/homepage-sections";
import type { HomepageSection, HomepageSectionInput, SectionRef } from "@/types/homepage";
import { homepageSectionSchema } from "@/validators/homepage.validator";
import { ReferencePicker } from "./reference-picker";

type TextValues = Record<SectionTextField, string>;

const HINTS: Partial<Record<SectionTextField, string>> = {
  title: "Press Enter to start a new line of the heading.",
  ctaHref: "A site path such as /collection, or an https:// link.",
};

/** Multi-line fields get a textarea. */
const LONG_FIELDS = new Set<SectionTextField>(["title", "subtitle", "description"]);

function textValuesOf(section?: HomepageSection): TextValues {
  return Object.fromEntries(
    SECTION_TEXT_FIELDS.map((field) => [field, section?.[field] ?? ""]),
  ) as TextValues;
}

/** Absent `section` adds one. */
export function SectionFormModal({
  section,
  onClose,
}: {
  section?: HomepageSection;
  onClose: () => void;
}) {
  const title = section ? `Edit ${SECTION_RULES[section.type].label.toLowerCase()}` : "Add section";
  return (
    <Dialog open onClose={onClose} title={title}>
      <SectionForm section={section} onClose={onClose} />
    </Dialog>
  );
}

function SectionForm({ section, onClose }: { section?: HomepageSection; onClose: () => void }) {
  const id = useId();
  const [type, setType] = useState<HomepageSectionType>(section?.type ?? "PROMO_BANNER");
  const [values, setValues] = useState<TextValues>(() => textValuesOf(section));
  const [imageId, setImageId] = useState<string | null>(section?.imageId ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(section?.imageUrl ?? null);
  const [seasonal, setSeasonal] = useState(section?.seasonal ?? false);
  const [refs, setRefs] = useState<SectionRef[]>(section?.refs ?? []);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const addSection = useAddHomepageSection();
  const updateSection = useUpdateHomepageSection();
  const mutation = section ? updateSection : addSection;

  const rule = SECTION_RULES[type];
  const fields = sectionFields(type);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Only the fields this type carries are sent; the rest go as null.
    const text = Object.fromEntries(
      SECTION_TEXT_FIELDS.map((field) => [field, fields.includes(field) ? values[field] : null]),
    ) as Record<SectionTextField, string | null>;

    const body: HomepageSectionInput = {
      ...text,
      imageId: rule.image ? imageId : null,
      seasonal: rule.seasonal && seasonal,
      visible: section?.visible ?? true,
      refIds: rule.refs ? refs.map((ref) => ref.id) : [],
    };

    const parsed = homepageSectionSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    const ruleErrors = checkSectionFields(type, parsed.data);
    if (Object.keys(ruleErrors).length > 0) {
      setErrors(ruleErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };

    if (section) updateSection.mutate({ id: section.id, ...body }, callbacks);
    else if (isAddableSectionType(type)) addSection.mutate({ type, ...body }, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5">
          {!section && (
            <Field id={`${id}-type`} label="Section type" error={error("type")}>
              <Select
                id={`${id}-type`}
                value={type}
                onChange={(event) => {
                  setType(event.target.value as HomepageSectionType);
                  // Brands and categories are different lists.
                  setRefs([]);
                }}
                className="h-11"
              >
                {ADDABLE_SECTION_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {SECTION_RULES[option].label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {fields.map((field) => {
            const fieldId = `${id}-${field}`;
            const required = rule.required.includes(field);
            const label = `${SECTION_FIELD_LABELS[field]}${required ? "" : " (optional)"}`;
            const common = {
              id: fieldId,
              value: values[field],
              onChange: (event: { target: { value: string } }) =>
                setValues((current) => ({ ...current, [field]: event.target.value })),
              "aria-invalid": error(field) ? true : undefined,
            };

            return (
              <Field key={field} id={fieldId} label={label} hint={HINTS[field]} error={error(field)}>
                {LONG_FIELDS.has(field) ? (
                  <Textarea {...common} rows={field === "title" ? 2 : 3} className="min-h-0" />
                ) : (
                  <Input {...common} className="h-11" />
                )}
              </Field>
            );
          })}

          {rule.image && (
            <ImageField
              label="Image (optional)"
              value={imageId}
              previewUrl={previewUrl}
              error={error("imageId")}
              onChange={(nextId, nextUrl) => {
                setImageId(nextId);
                setPreviewUrl(nextUrl);
              }}
            />
          )}

          {rule.seasonal && (
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={seasonal}
                onChange={(event) => setSeasonal(event.target.checked)}
                className="size-4 accent-accent"
              />
              Seasonal content
            </label>
          )}

          {rule.refs && (
            <ReferencePicker
              kind={rule.refs}
              value={refs}
              onChange={setRefs}
              error={error("refIds")}
            />
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        {mutation.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {mutation.error.message}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={mutation.isPending}>
          {section ? "Save to draft" : "Add to draft"}
        </Button>
      </DialogFooter>
    </form>
  );
}
```

- [ ] **Step 8: The builder**

`src/components/admin/homepage/homepage-builder.tsx`:

```tsx
"use client";

import { useRef, useState, type ReactNode } from "react";
import { Reorder } from "framer-motion";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteHomepageSection,
  useDiscardHomepageDraft,
  useGetHomepageDraft,
  usePublishHomepage,
  useReorderHomepageSections,
  useUpdateHomepageSection,
} from "@/hooks/use-homepage";
import { MAX_HOMEPAGE_SECTIONS, SECTION_RULES, headingLines } from "@/lib/homepage-sections";
import type { HomepageSection } from "@/types/homepage";
import { sectionInputOf } from "./section-input";
import { SectionFormModal } from "./section-form-modal";
import { SectionRow } from "./section-row";

type Modal = { kind: "create" } | { kind: "edit"; section: HomepageSection } | null;

/**
 * The homepage as a draft. Every edit here saves to the draft immediately;
 * nothing reaches the storefront until Publish.
 */
export function HomepageBuilder() {
  const draft = useGetHomepageDraft();
  const updateSection = useUpdateHomepageSection();
  const deleteSection = useDeleteHomepageSection();
  const reorder = useReorderHomepageSections();
  const publish = usePublishHomepage();
  const discard = useDiscardHomepageDraft();

  const [modal, setModal] = useState<Modal>(null);
  const [confirm, setConfirm] = useState<"publish" | "discard" | null>(null);
  const [toDelete, setToDelete] = useState<HomepageSection | null>(null);
  /** The order mid-drag and while it saves; null means "as loaded". */
  const [dragOrder, setDragOrder] = useState<HomepageSection[] | null>(null);
  const dragOrderRef = useRef<HomepageSection[] | null>(null);

  function handleReorder(next: HomepageSection[]) {
    dragOrderRef.current = next;
    setDragOrder(next);
  }

  function commitOrder() {
    const order = dragOrderRef.current;
    if (!order) return;
    reorder.mutate(
      order.map((section) => section.id),
      {
        // The hook refetches before this runs, so the list never flashes back.
        onSettled: () => {
          dragOrderRef.current = null;
          setDragOrder(null);
        },
      },
    );
  }

  function confirmAction() {
    const mutation = confirm === "publish" ? publish : discard;
    mutation.mutate(undefined, {
      onSuccess: () => {
        setConfirm(null);
        mutation.reset();
      },
    });
  }

  function cancelConfirm() {
    setConfirm(null);
    publish.reset();
    discard.reset();
  }

  function confirmDelete() {
    if (!toDelete) return;
    deleteSection.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null);
        deleteSection.reset();
      },
    });
  }

  function cancelDelete() {
    setToDelete(null);
    deleteSection.reset();
  }

  const sections = dragOrder ?? draft.data?.sections ?? [];
  const full = sections.length >= MAX_HOMEPAGE_SECTIONS;
  const rowError = [updateSection, reorder].find((mutation) => mutation.isError)?.error;

  let content: ReactNode;
  if (draft.isPending) {
    content = <BuilderSkeleton />;
  } else if (draft.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{draft.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => draft.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (sections.length === 0) {
    content = (
      <AdminEmptyState
        title="The homepage has no sections"
        description="Add a section to start. On a fresh database, the seed loads the default homepage — see docs/HOMEPAGE-CMS.md."
      />
    );
  } else {
    const { hasUnpublishedChanges, publishedAt } = draft.data;

    content = (
      <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-secondary">
            <Badge variant={hasUnpublishedChanges ? "warn" : "default"}>
              {hasUnpublishedChanges ? "Unpublished changes" : "Up to date"}
            </Badge>
            {publishedAt
              ? `Published ${new Date(publishedAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Never published"}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasUnpublishedChanges || publishedAt === null}
              onClick={() => setConfirm("discard")}
            >
              Discard draft
            </Button>
            <Button size="sm" disabled={!hasUnpublishedChanges} onClick={() => setConfirm("publish")}>
              Publish
            </Button>
          </div>
        </div>

        {rowError && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {rowError.message}
          </p>
        )}

        <Reorder.Group
          axis="y"
          values={sections}
          onReorder={handleReorder}
          className="overflow-hidden rounded-xl border border-line"
        >
          {sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              busy={
                reorder.isPending ||
                (updateSection.isPending && updateSection.variables?.id === section.id)
              }
              onEdit={() => setModal({ kind: "edit", section })}
              onToggleVisible={() =>
                updateSection.mutate({
                  id: section.id,
                  ...sectionInputOf(section),
                  visible: !section.visible,
                })
              }
              onDelete={
                SECTION_RULES[section.type].fixed ? undefined : () => setToDelete(section)
              }
              onDragEnd={commitOrder}
            />
          ))}
        </Reorder.Group>
      </>
    );
  }

  const deleteName = toDelete
    ? headingLines(toDelete.title ?? "").join(" ") || SECTION_RULES[toDelete.type].label
    : "section";
  const confirmMutation = confirm === "publish" ? publish : discard;

  return (
    <AdminPage
      title="Homepage Builder"
      description="Arrange, edit and show or hide homepage sections. Changes stay in the draft until you publish."
      actions={
        <Button
          size="sm"
          disabled={full || draft.isPending}
          title={full ? `The homepage holds up to ${MAX_HOMEPAGE_SECTIONS} sections.` : undefined}
          onClick={() => setModal({ kind: "create" })}
        >
          Add section
        </Button>
      }
    >
      {content}

      {modal && (
        <SectionFormModal
          section={modal.kind === "edit" ? modal.section : undefined}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "publish" ? "Publish the homepage?" : "Discard the draft?"}
        description={
          confirm === "publish"
            ? "Shoppers will see the draft exactly as it is now."
            : "Every change since the last publish is lost, and the draft goes back to what shoppers see."
        }
        confirmLabel={confirm === "publish" ? "Publish" : "Discard draft"}
        error={confirmMutation.isError ? confirmMutation.error.message : undefined}
        loading={confirmMutation.isPending}
        onCancel={cancelConfirm}
        onConfirm={confirmAction}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${deleteName}?`}
        description="It leaves the draft now and the storefront at the next publish."
        confirmLabel="Delete section"
        error={deleteSection.isError ? deleteSection.error.message : undefined}
        loading={deleteSection.isPending}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}

function BuilderSkeleton() {
  return (
    <div aria-busy className="grid gap-5">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-line">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
            <Skeleton className="size-6" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Type-check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no errors. If `Badge`'s `variant` rejects `"warn"`, it doesn't — `warn` is declared in `badge.tsx`. If the `common` spread in the form modal trips the `Textarea`/`Input` change-handler types, type `onChange` as `(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void` and import `ChangeEvent` from React.

---

### Task 6: Seed the default homepage

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `HomepageSectionType` from `src/lib/homepage-sections.ts`; `SHOP_INDEX_HREF` from `src/lib/route-map.ts`.
- Produces: seeded DRAFT + LIVE rows equal to today's homepage copy, and a published `homepage_state` row.

- [ ] **Step 1: Add the imports**

At the top of `prisma/seed.ts`, after the existing imports:

```ts
import type { HomepageSectionType } from "../src/lib/homepage-sections";
import { SHOP_INDEX_HREF } from "../src/lib/route-map";
```

- [ ] **Step 2: Add the default homepage and its seeder**

Above `async function main()`:

```ts
/* ============================================================
   Homepage — the copy the sections carried before the CMS
   ============================================================ */

interface SeedSection {
  type: HomepageSectionType;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

/** In page order. A "\n" in a title starts a new line of the heading. */
const homepage: SeedSection[] = [
  {
    type: "HERO",
    eyebrow: "A limited release, once a month.",
    description: "Certified refurbished electronics, released in numbered editions.",
    title: "Premium certified electronics.",
    subtitle: "Professionally inspected. Fully warranted. Released in very limited quantities.",
  },
  {
    type: "UPCOMING_DROPS",
    eyebrow: "Certified refurbished",
    title: "Refurbished.\nReady to ship.",
    subtitle:
      "Premium devices, professionally restored to the Rewire standard — 68-point inspection, certified battery health, and a 12-month warranty on every unit.",
    ctaLabel: "Browse the full catalogue",
    ctaHref: SHOP_INDEX_HREF,
  },
  {
    type: "BEST_SELLERS",
    eyebrow: "In stock now",
    title: "Best sellers.",
    subtitle:
      "No countdown, no allocation. The devices that move fastest, available to buy today and covered by the same standard as everything we release.",
    ctaLabel: "Shop all devices",
    ctaHref: SHOP_INDEX_HREF,
  },
  {
    type: "CONDITIONS",
    eyebrow: "Shop by condition",
    title: "What you have.",
    subtitle:
      "Three words, three different promises. Repair is what separates Refurbished from Pre-Owned; use is what separates both from Open Box. Every listing carries one of them, and it means this and only this.",
  },
  {
    type: "TESTIMONIALS",
    title: "The Rewire experience.",
    subtitle:
      "What people say after the box arrives — the part of a refurbished purchase nobody can promise you in advance.",
  },
  {
    type: "FAQ",
    title: "Questions,\nanswered.",
    subtitle:
      "Everything worth knowing before a drop opens — how the releases run, what we guarantee, and what happens after the box arrives.",
  },
  {
    type: "INVITATION",
    title: "The next one goes quickly too.",
    subtitle: "Join the waitlist for first access, launch reminders, and nothing else.",
    ctaLabel: "Join the waitlist",
  },
];

/**
 * Replaces the whole homepage — draft and live — and marks it published. Like
 * the policies, this overwrites anything edited in the console. Images that
 * only the old rows referenced are collected by the upload sweep.
 */
async function seedHomepage() {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.homepageSection.deleteMany({});

    for (const stage of ["DRAFT", "LIVE"] as const) {
      await tx.homepageSection.createMany({
        data: homepage.map((section, index) => ({
          stage,
          type: section.type,
          sortOrder: index,
          title: section.title,
          eyebrow: section.eyebrow ?? null,
          subtitle: section.subtitle ?? null,
          description: section.description ?? null,
          ctaLabel: section.ctaLabel ?? null,
          ctaHref: section.ctaHref ?? null,
        })),
      });
    }

    await tx.homepageState.upsert({
      where: { id: "homepage" },
      create: { id: "homepage", draftUpdatedAt: now, publishedAt: now },
      update: { draftUpdatedAt: now, publishedAt: now },
    });
  });

  console.log(`  ${homepage.length} sections, published`);
}
```

- [ ] **Step 3: Call it from `main`**

```ts
async function main() {
  console.log("Policies:");
  await seedPolicies();
  console.log("Homepage:");
  await seedHomepage();
  console.log("Admin:");
  await seedAdmin();
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no errors. (If `tsconfig.json` excludes `prisma/`, run `npx tsc --noEmit -p tsconfig.json` anyway and additionally confirm the seed's imports resolve by opening it in the editor; the owner's `npm run db:seed` in Task 10 is the real check.)

---

### Task 7: Existing sections take their copy from props

**Files:**
- Modify: `src/components/home/hero/hero.tsx`
- Modify: `src/components/home/upcoming-drops/upcoming-drops.tsx`
- Modify: `src/components/home/featured/featured.tsx`
- Modify: `src/components/home/conditions/what-you-have.tsx`
- Modify: `src/components/home/stories/stories.tsx`
- Modify: `src/components/home/faq/faq.tsx`
- Modify: `src/components/home/invitation/invitation.tsx`

**Interfaces:**
- Consumes: `PublishedSection` (Task 2), `headingLines`.
- Produces: `Hero`, `UpcomingDrops`, `Featured`, `WhatYouHave`, `Stories`, `Invitation` each take `{ section: PublishedSection }`. `Faq` takes `{ faqs, heading: string[], lede?: string | null, headingLevel? }` — `heading` is now required and any length.

Item data sources (`getLiveDrop`, `getUpcomingDrops`, `getFeaturedProducts`, `CONDITIONS`, `getTestimonials`, `getNextDrop`) do not change.

- [ ] **Step 1: Hero**

Add imports `import { headingLines } from "@/lib/homepage-sections";` and `import type { PublishedSection } from "@/types/homepage";`. Change the signature to:

```tsx
export function Hero({ section }: { section: PublishedSection }) {
```

Replace the tagline paragraph's contents (currently "A limited release, once a month." / "Certified refurbished electronics, released in numbered editions."):

```tsx
            <p className="max-w-[16rem] font-mono text-[0.6875rem] uppercase leading-loose tracking-[0.22em] text-ink-secondary md:max-w-none">
              {section.eyebrow}
              {section.eyebrow && section.description && <br />}
              {section.description && (
                <span className="text-ink-muted">{section.description}</span>
              )}
            </p>
```

Replace the `h1` text and the paragraph beneath it:

```tsx
            <h1
              id="hero-heading"
              className="font-sans text-[clamp(2.25rem,3.4vw,3.25rem)] font-light leading-[1.06] tracking-[-0.03em] text-ink"
            >
              {headingLines(section.title).map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))}
            </h1>
            {section.subtitle && (
              <p className="mt-5 text-base leading-relaxed text-ink-secondary sm:mt-8">
                {section.subtitle}
              </p>
            )}
```

- [ ] **Step 2: Upcoming drops**

Add the same two imports. Remove the now-unused `SHOP_INDEX_HREF` import. Signature: `export function UpcomingDrops({ section }: { section: PublishedSection }) {`.

Eyebrow line:

```tsx
            {section.eyebrow && (
              <>
                {section.eyebrow}
                <span aria-hidden className="mx-2.5 text-ink-faint">
                  ·
                </span>
              </>
            )}
            {String(drops.length).padStart(2, "0")} devices
```

Heading — replace the two hardcoded line spans with:

```tsx
              {headingLines(section.title).map((line, index) => (
                <span key={index} className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                  <motion.span variants={lineClip} className="block">
                    {line}
                  </motion.span>
                </span>
              ))}
```

Paragraph — wrap in `{section.subtitle && (…)}` with `{section.subtitle}` as its text.

Footer — wrap the whole footer `motion.div` in `{section.ctaLabel && section.ctaHref && (…)}`, set `href={section.ctaHref}` and replace "Browse the full catalogue" with `{section.ctaLabel}`.

- [ ] **Step 3: Best sellers (`Featured`)**

Same imports, remove `SHOP_INDEX_HREF`, signature `export function Featured({ section }: { section: PublishedSection }) {`.

- "In stock now" `motion.p` → wrap in `{section.eyebrow && (…)}` with `{section.eyebrow}`.
- `h2` contents → the `headingLines(section.title).map(…)` block from Step 2.
- Description `motion.p` → `{section.subtitle && (…)}` with `{section.subtitle}`.
- CTA `motion.div` → `{section.ctaLabel && section.ctaHref && (…)}`, `href={section.ctaHref}`, label `{section.ctaLabel}`.

- [ ] **Step 4: Conditions (`WhatYouHave`)**

Same two imports. Signature `export function WhatYouHave({ section }: { section: PublishedSection }) {`.

- `<p className="eyebrow">Shop by condition</p>` → `{section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}`.
- `h2` contents → `headingLines(section.title).map(…)` using this component's own span classes (`pb-[0.15em] -mb-[0.15em]`).
- Paragraph → `{section.subtitle && (…)}` with `{section.subtitle}`.

- [ ] **Step 5: Testimonials (`Stories`)**

Same two imports. Signature `export function Stories({ section }: { section: PublishedSection }) {`.

- `h2` contents → `headingLines(section.title).map(…)` (Step 2's block).
- Right-hand paragraph → `{section.subtitle && (…)}` with `{section.subtitle}`.
- The rating line is derived from data and stays as it is.

- [ ] **Step 6: FAQ**

Change the props so the homepage defaults leave the component (they now live in the seed):

```tsx
export function Faq({
  faqs,
  heading,
  lede,
  headingLevel = "h2",
}: {
  faqs: FaqEntry[];
  /** One entry per line of the heading. */
  heading: string[];
  lede?: string | null;
  headingLevel?: "h1" | "h2";
}) {
```

Heading contents:

```tsx
              {heading.filter(Boolean).map((line, index) => (
                <span key={index} className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                  <motion.span variants={lineClip} className="block">
                    {line}
                  </motion.span>
                </span>
              ))}
```

Lede → `{lede && (<motion.p …>{lede}</motion.p>)}`.

`src/app/(site)/faq/page.tsx` passes a `[string, string]` tuple (assignable to `string[]`) and a `lede`; it needs no edit. `.filter(Boolean)` drops the empty second line it produces for a one-word title.

- [ ] **Step 7: Invitation**

Same two imports. Signature `export function Invitation({ section }: { section: PublishedSection }) {`.

- `h2` contents → `headingLines(section.title).map((line, index) => <span key={index} className="block">{line}</span>)`.
- Paragraph → `{section.subtitle && (…)}` with `{section.subtitle}`.
- Button block → `{section.ctaLabel && (<div className="mt-11 flex justify-center"><Button …>{section.ctaLabel}</Button></div>)}`.

- [ ] **Step 8: Type-check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: the only errors are in `src/app/(site)/page.tsx`, which still renders the sections without props — fixed in Task 8. Lint clean.

---

### Task 8: New sections and the homepage renderer

**Files:**
- Create: `src/components/home/shared/section-header.tsx`
- Create: `src/components/home/promo-banner/promo-banner.tsx`
- Create: `src/components/home/featured-brands/featured-brands.tsx`
- Create: `src/components/home/featured-categories/featured-categories.tsx`
- Create: `src/components/home/homepage-section.tsx`
- Modify: `src/app/(site)/page.tsx`

**Interfaces:**
- Consumes: `getPublishedHomepage()` (Task 3), Task 7 component signatures, `PublishedSection`.
- Produces: `<SectionHeader>`, `<SectionCta>`, `rise`; `<PromoBanner>`, `<FeaturedBrands>`, `<FeaturedCategories>` each `{ section: PublishedSection }`; `<HomepageSection section faqs />`.

- [ ] **Step 1: Shared header and CTA**

`src/components/home/shared/section-header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { headingLines } from "@/lib/homepage-sections";
import { DURATION, EASE_OUT_EXPO, staggerChildren, viewportOnce } from "@/lib/motion";

/**
 * The header and closing link the CMS-built sections share, set in the same
 * type scale and motion as Best sellers so an added section reads as part of
 * the page rather than a widget dropped onto it.
 */

export const rise = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

const lineClip = {
  hidden: { y: "140%" },
  visible: { y: "0%", transition: { duration: 1, ease: EASE_OUT_EXPO } },
};

export function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
}: {
  /** The heading's id, for the section's `aria-labelledby`. */
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={staggerChildren(0.1)}
    >
      {eyebrow && (
        <motion.p
          variants={rise}
          className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-muted"
        >
          {eyebrow}
        </motion.p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
        <h2
          id={id}
          className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.03] tracking-[-0.035em] text-ink lg:col-span-6"
        >
          {headingLines(title).map((line, index) => (
            <span key={index} className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
              <motion.span variants={lineClip} className="block">
                {line}
              </motion.span>
            </span>
          ))}
        </h2>

        {subtitle && (
          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:col-start-8 lg:justify-self-end lg:pt-3"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

/** The outline link that closes a section. Renders nothing without both parts. */
export function SectionCta({ label, href }: { label: string | null; href: string | null }) {
  if (!label || !href) return null;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={rise}
      className="mt-16 flex justify-center lg:mt-20"
    >
      <Link href={href} className={buttonVariants({ variant: "outline", size: "md" })}>
        {label}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </Link>
    </motion.div>
  );
}
```

- [ ] **Step 2: Promo banner**

`src/components/home/promo-banner/promo-banner.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { rise } from "@/components/home/shared/section-header";
import { headingLines } from "@/lib/homepage-sections";
import { DURATION, EASE_OUT_EXPO, staggerChildren, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PublishedSection } from "@/types/homepage";

/**
 * A promotional or seasonal band, authored in the console. Copy left, image
 * right; without an image the copy takes the wider column.
 *
 * The image is decorative (`alt=""`): the banner's meaning is in its heading,
 * and the model has no alt-text field. Add one before banners carry images
 * that say something the copy doesn't.
 */
export function PromoBanner({ section }: { section: PublishedSection }) {
  const headingId = `promo-${section.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden bg-surface-2 py-(--spacing-section-sm)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto grid w-full max-w-[110rem] gap-10 px-(--spacing-gutter) lg:grid-cols-12 lg:items-center lg:gap-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className={section.imageUrl ? "lg:col-span-5" : "lg:col-span-8"}
        >
          {(section.seasonal || section.eyebrow) && (
            <motion.div variants={rise} className="flex flex-wrap items-center gap-3">
              {section.seasonal && <Badge variant="accent">Seasonal</Badge>}
              {section.eyebrow && (
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-muted">
                  {section.eyebrow}
                </p>
              )}
            </motion.div>
          )}

          <motion.h2
            id={headingId}
            variants={rise}
            className="mt-8 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.03] tracking-[-0.035em] text-ink"
          >
            {headingLines(section.title).map((line, index) => (
              <span key={index} className="block">
                {line}
              </span>
            ))}
          </motion.h2>

          {section.subtitle && (
            <motion.p variants={rise} className="mt-6 max-w-md text-lg leading-relaxed text-ink">
              {section.subtitle}
            </motion.p>
          )}
          {section.description && (
            <motion.p
              variants={rise}
              className="mt-4 max-w-md text-base leading-relaxed text-ink-secondary"
            >
              {section.description}
            </motion.p>
          )}

          {section.ctaLabel && section.ctaHref && (
            <motion.div variants={rise} className="mt-10">
              <Link
                href={section.ctaHref}
                className={buttonVariants({ variant: "accent", size: "md" })}
              >
                {section.ctaLabel}
              </Link>
            </motion.div>
          )}
        </motion.div>

        {section.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: DURATION.cinematic, ease: EASE_OUT_EXPO }}
            className={cn(
              "relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface",
              "lg:col-span-6 lg:col-start-7",
            )}
          >
            {/* `unoptimized`: served by /api/v1/media, as in the console. */}
            <Image
              src={section.imageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              unoptimized
            />
          </motion.div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Featured brands**

`src/components/home/featured-brands/featured-brands.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SectionCta, SectionHeader, rise } from "@/components/home/shared/section-header";
import { staggerChildren, viewportOnce } from "@/lib/motion";
import type { PublishedSection } from "@/types/homepage";

/** A row of brand plates, each opening the shop filtered to that brand. */
export function FeaturedBrands({ section }: { section: PublishedSection }) {
  const headingId = `brands-${section.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden bg-void py-(--spacing-section-sm)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <SectionHeader
          id={headingId}
          eyebrow={section.eyebrow}
          title={section.title}
          subtitle={section.subtitle}
        />

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.06, 0.1)}
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-16 lg:grid-cols-6 lg:gap-4"
        >
          {section.items.map((brand) => (
            <motion.li key={brand.id} variants={rise} className="flex">
              <Link
                href={brand.href}
                className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-edge) transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-out-quart) hover:border-line-strong hover:bg-surface-3"
              >
                {brand.imageUrl && (
                  <span className="relative block h-12 w-full">
                    <Image
                      src={brand.imageUrl}
                      alt=""
                      fill
                      sizes="10rem"
                      className="object-contain"
                      unoptimized
                    />
                  </span>
                )}
                <span className="text-sm font-medium text-ink">{brand.name}</span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        <SectionCta label={section.ctaLabel} href={section.ctaHref} />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Featured categories**

`src/components/home/featured-categories/featured-categories.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SectionCta, SectionHeader, rise } from "@/components/home/shared/section-header";
import { staggerChildren, viewportOnce } from "@/lib/motion";
import type { PublishedSection } from "@/types/homepage";

/** Category plates: the category's photograph with its name beneath. */
export function FeaturedCategories({ section }: { section: PublishedSection }) {
  const headingId = `categories-${section.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden bg-void py-(--spacing-section-sm)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <SectionHeader
          id={headingId}
          eyebrow={section.eyebrow}
          title={section.title}
          subtitle={section.subtitle}
        />

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.08, 0.1)}
          className="mt-14 grid grid-cols-1 gap-x-4 gap-y-10 min-[360px]:grid-cols-2 sm:gap-x-6 lg:mt-16 xl:grid-cols-4"
        >
          {section.items.map((category) => (
            <motion.li key={category.id} variants={rise} className="flex">
              <Link href={category.href} className="group flex w-full flex-col gap-4">
                <span className="relative block aspect-square overflow-hidden rounded-2xl border border-line bg-surface shadow-(--shadow-edge)">
                  {category.imageUrl && (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1280px) 50vw, 25vw"
                      className="object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-quart) group-hover:scale-[1.03]"
                      unoptimized
                    />
                  )}
                </span>
                <span className="text-base font-medium text-ink">{category.name}</span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        <SectionCta label={section.ctaLabel} href={section.ctaHref} />
      </div>
    </section>
  );
}
```

- [ ] **Step 5: The type → component switch**

`src/components/home/homepage-section.tsx`:

```tsx
import type { ReactNode } from "react";
import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Featured } from "@/components/home/featured/featured";
import { WhatYouHave } from "@/components/home/conditions/what-you-have";
import { Stories } from "@/components/home/stories/stories";
import { Faq } from "@/components/home/faq/faq";
import { Invitation } from "@/components/home/invitation/invitation";
import { PromoBanner } from "@/components/home/promo-banner/promo-banner";
import { FeaturedBrands } from "@/components/home/featured-brands/featured-brands";
import { FeaturedCategories } from "@/components/home/featured-categories/featured-categories";
import type { FaqEntry } from "@/lib/faq-entry";
import { headingLines } from "@/lib/homepage-sections";
import type { PublishedSection } from "@/types/homepage";

/**
 * One published section → its component. The switch is exhaustive, so a new
 * section type fails the type-check here until it has a component.
 */
export function HomepageSection({
  section,
  faqs,
}: {
  section: PublishedSection;
  /** The FAQ policy's entries; the FAQ section is omitted when there are none. */
  faqs: FaqEntry[];
}): ReactNode {
  switch (section.type) {
    case "HERO":
      return <Hero section={section} />;
    case "UPCOMING_DROPS":
      return <UpcomingDrops section={section} />;
    case "BEST_SELLERS":
      return <Featured section={section} />;
    case "CONDITIONS":
      return <WhatYouHave section={section} />;
    case "TESTIMONIALS":
      return <Stories section={section} />;
    case "FAQ":
      return faqs.length > 0 ? (
        <Faq faqs={faqs} heading={headingLines(section.title)} lede={section.subtitle} />
      ) : null;
    case "INVITATION":
      return <Invitation section={section} />;
    case "PROMO_BANNER":
      return <PromoBanner section={section} />;
    case "FEATURED_BRANDS":
      return <FeaturedBrands section={section} />;
    case "FEATURED_CATEGORIES":
      return <FeaturedCategories section={section} />;
  }
}
```

- [ ] **Step 6: The page**

Replace `src/app/(site)/page.tsx`:

```tsx
import { HomepageSection } from "@/components/home/homepage-section";
import { toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";
import { getPublishedHomepage } from "@/services/homepage.service";

/**
 * The homepage is whatever was last published in the Homepage Builder — see
 * docs/HOMEPAGE-CMS.md. There is no fallback copy here: an unpublished
 * database renders the header and footer only, and the seed publishes the
 * defaults.
 */
export default async function Home() {
  const sections = await getPublishedHomepage();
  const faqs = sections.some((section) => section.type === "FAQ")
    ? toFaqEntries(await getPublishedPolicy("faq"))
    : [];

  return (
    <>
      {sections.map((section) => (
        <HomepageSection key={section.id} section={section} faqs={faqs} />
      ))}
    </>
  );
}
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no errors anywhere.

---

### Task 9: Docs

**Files:**
- Create: `docs/HOMEPAGE-CMS.md`
- Modify: `docs/ADMIN-PANEL.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write `docs/HOMEPAGE-CMS.md`**

Match the voice of `docs/POLICY-CMS.md`. Sections and the facts each must state:

1. **What this is** — the homepage is rendered from sections edited at `/admin/storefront/homepage`; files table (every file in this plan's file map, one line each).
2. **Draft and live** — two stages of rows; Publish copies draft → live in one transaction and revalidates `homepage` + `/`; Discard copies live → draft; `HomepageState.draftUpdatedAt` vs `publishedAt` drives "Unpublished changes"; why rows and not a JSON snapshot (the orphan sweep); only draft ids are addressable.
3. **Section types** — the table from spec §3.3 (types, item sources, editable fields, required marks, fixed vs addable); `SECTION_RULES` in `src/lib/homepage-sections.ts` is the one place it's defined and both the form and the service check it; fixed sections hide, never delete; a new line in a title is a new heading line; CTA label and link go together; `ctaHref` rules.
4. **What P2 and P3 rewire later** — best sellers still read `src/lib/products.ts`, drop sections read `src/lib/drops.ts`; curated product sections wait for P2's product API; item links for brands/categories are best effort (explain the brand-name filter and the `resolveCategory` check) and move to real listing routes with P2.
5. **Images and references** — `imageId` is a real relation; the sweep and `releaseImage` count homepage sections of both stages; brand/category deletes aren't blocked and revalidate the homepage; missing refs are skipped, and a featured section with none left isn't rendered.
6. **Limits** — 30 sections (why the draft list isn't paginated — DATA-LAYER §4), 12 refs, text lengths; no optimistic concurrency (two editors overwrite each other; a stale reorder is refused); drag reorder is pointer-only, like the policy editor; promo images are decorative (no alt field).
7. **Seed** — `npm run db:seed` replaces the whole homepage (draft and live) with the default copy and publishes it, overwriting console edits; with no published rows the homepage renders header and footer only.
8. **Adding a section type** — add to the Prisma enum (migration), `HOMEPAGE_SECTION_TYPES`, `SECTION_RULES`, (`ADDABLE_SECTION_TYPES` if staff add it), a component, and a case in `homepage-section.tsx` (the exhaustive switch fails the type-check until you do).

- [ ] **Step 2: Update `docs/ADMIN-PANEL.md`**

- Add a `## Homepage Builder` section after "Categories and Brands": route, permission key `storefront.homepage`, one-paragraph summary, and "See docs/HOMEPAGE-CMS.md".
- In "Categories and Brands" → **Images**, change "Changing or removing an image deletes the old asset once nothing else points at it." to "…once nothing else — a category, a brand or a homepage section — points at it." and note the upload endpoint also serves the homepage banner modal.

- [ ] **Step 3: Update `AGENTS.md`**

Add a row to the "Read before you change code" table:

```markdown
| Homepage sections, the Homepage Builder, publishing | [docs/HOMEPAGE-CMS.md](docs/HOMEPAGE-CMS.md) |
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: clean (docs aren't linted, this confirms nothing else moved).

---

### Task 10: Final verification and handoff

- [ ] **Step 1: Agent checks**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: both clean. Report the output verbatim.

- [ ] **Step 2: Hand the owner this checklist, verbatim**

> Code is in the working tree, uncommitted. Please run:
>
> 1. `npm run db:seed`, then `npm run build`, then `npm run dev`.
>
> Then check:
>
> 1. `/` looks the same as before this change (same sections, same order, same copy).
> 2. In `/admin/storefront/homepage`, edit Best sellers' title → `/` unchanged, badge says "Unpublished changes" → Publish → `/` shows the new title.
> 3. Hide Testimonials and drag Conditions above Best sellers → Publish → both reflected on `/`.
> 4. Add a promo banner with an image, marked seasonal → Publish → it renders. Replace its image in the draft and **don't** publish → `/` still shows the old image. Publish → new image.
> 5. Add Featured brands and Featured categories sections → Publish → both render and each card links somewhere that isn't a 404.
> 6. Make any edit, then Discard draft → the console returns to the live state and the badge clears.
> 7. Delete a brand that's in a published Featured brands section → `/` drops it without a publish; delete the last one → the section disappears.
> 8. Open the builder in two tabs, add a section in one, drag-reorder in the other → "The page changed since you loaded it."
> 9. Set a banner's button link to `//example.com`, then `javascript:alert(1)`, then `http://example.com` → each is refused on the link field.
> 10. On an empty database (before seeding): the builder shows "The homepage has no sections", Discard is refused with "Nothing has been published yet", and `/` renders header and footer only.
> 11. Signed out, `GET /api/v1/admin/homepage` → 401. As a customer → 403 (or the access-denied screen at the page).
> 12. Try to delete the Hero → there is no delete control; a direct `DELETE` on its id → 409.
