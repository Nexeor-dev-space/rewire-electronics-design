# Homepage Page Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/admin/storefront/homepage` placeholder with a working Homepage Builder on the existing Homepage CMS API, and add a staff only draft preview.

**Architecture:** The backend (draft and live rows, admin API, publish, discard) already exists. This adds pure client-safe helpers (`src/lib/homepage-builder.ts`, unit tested), React Query hooks (`src/hooks/use-homepage.ts`), three admin components in `src/components/admin/homepage/`, a stage parameter on the storefront read, a shared `HomepageSections` server component and a `/preview/homepage` route.

**Tech Stack:** Next.js 15 App Router, TypeScript, React Query 5, Zod 4, Prisma 7, Tailwind v4, Vitest (node environment, `src/**/*.test.ts` only).

**Spec:** `docs/superpowers/specs/2026-10-01-homepage-page-builder-design.md`

## Global Constraints

1. No schema changes, no migrations, no new env vars, no new dependencies.
2. Never read `.env`, and never run `next dev`, `next build` or any Prisma CLI command (they read `.env`). Verify with `npm test`, `npx tsc --noEmit` and `npm run lint` only.
3. Do not `git commit` or stage anything. The owner handles git; leave all changes in the working tree.
4. No `fetch` or data loading in `useEffect` inside components; data goes through hooks calling `apiRequest`. No path strings outside `API_ENDPOINTS`.
5. No Prisma or `@/generated/prisma` import in client code. `src/lib/homepage-builder.ts` must stay client-safe (no `server-only`, no Prisma, no Next).
6. Colours, spacing and durations come from existing tokens and classes (`text-ink`, `border-line`, `duration-(--duration-fast)`, …). No magic values.
7. Field rules come from `SECTION_RULES`, `sectionFields`, `SECTION_FIELD_LABELS`, `SECTION_TEXT_LIMITS`, `MAX_HOMEPAGE_SECTIONS`, `MAX_SECTION_REFS` in `src/lib/homepage-sections.ts`. Do not restate limits.
8. In docs, do not use the `-` symbol for lists; use numbered lists or tables.

## Review Focus

1. A featured section whose chosen brands were all deleted later: its draft `refs` is empty, so toggling visibility sends `refIds: []` and the API answers 422 "Choose at least one brand." The builder must show that message on the row area (not fail silently) so staff open Edit and pick again. Covered by Task 7's error banner and by Task 1's test that `sectionToInput` passes `refs` through as ids.
2. Stale tab reorder: a section was added or deleted in another tab, then Move up answers 422 "The page changed since you loaded it". Expected: the message shows and the list refetches. Task 7 handles this in `move`.
3. A title with a line break (`"Refurbished.\nReady to ship."`): the textarea must keep the newline and the list row must show only the first line. Task 1 tests `firstLine`.
4. Clearing an optional field: an empty input must be sent as null so the API clears it, and a whitespace only required title must be refused on the client. Task 1 tests `validateSection` with `"   "` titles.
5. A button link like `//evil.com` or `javascript:alert(1)`: the client refuses it with the same message as the server. Task 1 tests it.

---

## File map

| File | Action | Responsibility |
| --- | --- | --- |
| `src/lib/homepage-builder.ts` | Create | Pure helpers: `swapItems`, `sectionToInput`, `emptySectionInput`, `validateSection`, `firstLine`, `flattenCategoryRefs` |
| `src/lib/homepage-builder.test.ts` | Create | Unit tests for the helpers |
| `src/hooks/use-homepage.ts` | Create | React Query hooks for the admin homepage API |
| `src/services/homepage.service.ts` | Modify | `getPublishedHomepage` body becomes `getHomepageSections(stage)` |
| `src/components/home/homepage-sections.tsx` | Create | Server component: loads FAQ and products, renders a list of sections |
| `src/app/(site)/page.tsx` | Modify | Uses `HomepageSections` |
| `src/app/(site)/preview/homepage/page.tsx` | Create | Staff only draft preview |
| `src/components/admin/homepage/ref-picker.tsx` | Create | Brand or category chooser |
| `src/components/admin/homepage/section-form-modal.tsx` | Create | Add and edit form for any section type |
| `src/components/admin/homepage/homepage-builder.tsx` | Create | The builder screen |
| `src/app/admin/storefront/homepage/page.tsx` | Create | Route with permission guard |
| `src/app/admin/[...slug]/page.tsx` | Modify | Add the route to `BUILT_ROUTES` |
| `docs/HOMEPAGE-CMS.md`, `docs/ADMIN-PANEL.md` | Modify | Document the builder and preview |

---

### Task 1: Pure builder helpers

**Files:**
- Create: `src/lib/homepage-builder.ts`
- Test: `src/lib/homepage-builder.test.ts`

**Interfaces:**
- Consumes: `HomepageSection`, `HomepageSectionInput`, `SectionRef` from `@/types/homepage`; `CategoryNode` from `@/types/category`; `homepageSectionSchema` from `@/validators/homepage.validator`; `checkSectionFields`, `HomepageSectionType` from `@/lib/homepage-sections`.
- Produces:
  - `swapItems<T>(items: T[], index: number, offset: -1 | 1): T[]`
  - `sectionToInput(section: HomepageSection): SectionFormInput`
  - `emptySectionInput(): SectionFormInput`
  - `validateSection(type: HomepageSectionType, input: SectionFormInput): Record<string, string[]>`
  - `firstLine(title: string | null): string`
  - `flattenCategoryRefs(nodes: CategoryNode[]): SectionRef[]`
  - `type SectionFormInput = Required<HomepageSectionInput>` where every text field is `string | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/homepage-builder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { CategoryNode } from "@/types/category";
import type { HomepageSection } from "@/types/homepage";
import {
  emptySectionInput,
  firstLine,
  flattenCategoryRefs,
  sectionToInput,
  swapItems,
  validateSection,
} from "./homepage-builder";

const section: HomepageSection = {
  id: "s1",
  type: "FEATURED_BRANDS",
  visible: true,
  seasonal: false,
  eyebrow: "Shop by brand",
  title: "Brands\nwe trust",
  subtitle: null,
  description: null,
  ctaLabel: null,
  ctaHref: null,
  imageId: null,
  imageUrl: null,
  refs: [
    { id: "b1", name: "Apple" },
    { id: "b2", name: "Samsung" },
  ],
  updatedAt: "2026-10-01T00:00:00.000Z",
};

describe("swapItems", () => {
  it("moves an item up and down without mutating the input", () => {
    const ids = ["a", "b", "c"];
    expect(swapItems(ids, 1, -1)).toEqual(["b", "a", "c"]);
    expect(swapItems(ids, 1, 1)).toEqual(["a", "c", "b"]);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("returns the same order when the move would leave the list", () => {
    expect(swapItems(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(swapItems(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});

describe("sectionToInput", () => {
  it("copies the editable fields and turns refs into ids in order", () => {
    expect(sectionToInput(section)).toEqual({
      eyebrow: "Shop by brand",
      title: "Brands\nwe trust",
      subtitle: null,
      description: null,
      ctaLabel: null,
      ctaHref: null,
      imageId: null,
      seasonal: false,
      visible: true,
      refIds: ["b1", "b2"],
    });
  });

  it("gives empty refIds when every chosen brand was deleted", () => {
    expect(sectionToInput({ ...section, refs: [] }).refIds).toEqual([]);
  });
});

describe("emptySectionInput", () => {
  it("starts visible with nothing filled", () => {
    expect(emptySectionInput()).toMatchObject({ title: null, visible: true, refIds: [] });
  });
});

describe("validateSection", () => {
  const brands = { ...emptySectionInput(), title: "Brands", refIds: ["clh1x2y3z0000abcd1234efgh"] };

  it("accepts a valid featured brands section", () => {
    expect(validateSection("FEATURED_BRANDS", brands)).toEqual({});
  });

  it("refuses a whitespace only title", () => {
    expect(validateSection("FEATURED_BRANDS", { ...brands, title: "   " }).title).toEqual([
      "Enter a title.",
    ]);
  });

  it("refuses a featured section with no items", () => {
    expect(validateSection("FEATURED_BRANDS", { ...brands, refIds: [] }).refIds).toEqual([
      "Choose at least one brand.",
    ]);
  });

  it("refuses unsafe button links", () => {
    for (const ctaHref of ["//evil.com", "javascript:alert(1)", "/\\evil.com"]) {
      const errors = validateSection("PROMO_BANNER", {
        ...emptySectionInput(),
        title: "Sale",
        ctaLabel: "Shop",
        ctaHref,
      });
      expect(errors.ctaHref?.[0]).toBe("Use a site path such as /collection, or an https:// link.");
    }
  });

  it("asks for both button fields together", () => {
    const errors = validateSection("PROMO_BANNER", {
      ...emptySectionInput(),
      title: "Sale",
      ctaLabel: "Shop",
    });
    expect(errors.ctaHref).toEqual(["Fill in both the button label and link, or neither."]);
  });

  it("refuses a field the type does not carry", () => {
    const errors = validateSection("FAQ", { ...emptySectionInput(), title: "FAQ", eyebrow: "Help" });
    expect(errors.eyebrow).toEqual(["A faq section has no eyebrow."]);
  });
});

describe("firstLine", () => {
  it("returns the first heading line", () => {
    expect(firstLine("Refurbished.\nReady to ship.")).toBe("Refurbished.");
    expect(firstLine("\n  Hello  \nWorld")).toBe("Hello");
  });

  it("returns an empty string for no title", () => {
    expect(firstLine(null)).toBe("");
  });
});

describe("flattenCategoryRefs", () => {
  it("lists parents and then their children, naming children with their parent", () => {
    const nodes = [
      {
        id: "p1",
        name: "Phones",
        children: [{ id: "c1", name: "iPhone" }],
      },
    ] as unknown as CategoryNode[];
    expect(flattenCategoryRefs(nodes)).toEqual([
      { id: "p1", name: "Phones" },
      { id: "c1", name: "Phones › iPhone" },
    ]);
  });
});
```

Note: the id in `brands.refIds` must pass `idValidator` from `src/validators/common/primitives.validator.ts`. Open that file first; if it is not a cuid check, replace the sample id with one that passes.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/homepage-builder.test.ts`
Expected: FAIL, "Failed to resolve import ./homepage-builder".

- [ ] **Step 3: Write the implementation**

Create `src/lib/homepage-builder.ts`:

```ts
/**
 * Pure helpers for the Homepage Builder screen. Client-safe: no Prisma, no
 * Next, no `server-only`. Field rules live in `homepage-sections.ts`; this
 * file only adapts them to the form.
 */

import { z } from "zod";
import { checkSectionFields, type HomepageSectionType } from "@/lib/homepage-sections";
import type { CategoryNode } from "@/types/category";
import type { HomepageSection, HomepageSectionInput, SectionRef } from "@/types/homepage";
import { homepageSectionSchema } from "@/validators/homepage.validator";

/** A section body with every field present, as the form holds it. */
export type SectionFormInput = Required<HomepageSectionInput>;

/** `items` with the one at `index` moved one place; unchanged at the ends. */
export function swapItems<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** A draft section as the body its PUT expects. */
export function sectionToInput(section: HomepageSection): SectionFormInput {
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

export function emptySectionInput(): SectionFormInput {
  return {
    eyebrow: null,
    title: null,
    subtitle: null,
    description: null,
    ctaLabel: null,
    ctaHref: null,
    imageId: null,
    seasonal: false,
    visible: true,
    refIds: [],
  };
}

/**
 * The same checks the API runs, so obvious mistakes show before a round
 * trip: the shared schema first, then the type's rules on the parsed body.
 */
export function validateSection(
  type: HomepageSectionType,
  input: SectionFormInput,
): Record<string, string[]> {
  const parsed = homepageSectionSchema.safeParse(input);
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return Object.fromEntries(
      Object.entries(fields).filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length)),
    );
  }
  return checkSectionFields(type, parsed.data);
}

/** The first non-empty line of a stored title, for list rows. */
export function firstLine(title: string | null): string {
  return (title ?? "").split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

/** A category tree page as picker options: each parent, then its children. */
export function flattenCategoryRefs(nodes: CategoryNode[]): SectionRef[] {
  return nodes.flatMap((parent) => [
    { id: parent.id, name: parent.name },
    ...parent.children.map((child) => ({ id: child.id, name: `${parent.name} › ${child.name}` })),
  ]);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/homepage-builder.test.ts`
Expected: PASS, all tests green. If `validateSection("FAQ", …)` reports a different noun, check `rule.label.toLowerCase()` in `checkSectionFields` and update the expected text to match the existing message rather than changing the shared rule.

- [ ] **Step 5: Leave changes in the working tree** (no commit).

---

### Task 2: React Query hooks

**Files:**
- Create: `src/hooks/use-homepage.ts`

**Interfaces:**
- Consumes: `API_ENDPOINTS.admin.homepage` (`draft`, `sections`, `section(id)`, `order`, `publish`, `discard`), `apiRequest`, `HomepageDraft`, `HomepageSectionInput`, `CreateHomepageSectionInput`.
- Produces: `useGetHomepageDraft()`, `useAddHomepageSection()` (variables `CreateHomepageSectionInput`), `useUpdateHomepageSection()` (variables `HomepageSectionInput & { id: string }`), `useDeleteHomepageSection()` (variables `string`), `useReorderHomepageSections()` (variables `string[]`), `usePublishHomepage()`, `useDiscardHomepageDraft()` (no variables). Every mutation resolves to `HomepageDraft`.

- [ ] **Step 1: Write the hooks**

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

/**
 * Every homepage route answers with the whole draft, so a mutation writes it
 * straight into the cache, then invalidates so other tabs' changes come in.
 */
function useDraftMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<HomepageDraft>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (draft) => {
      queryClient.setQueryData(homepageKeys.draft, draft);
      return queryClient.invalidateQueries({ queryKey: homepageKeys.all });
    },
  });
}

export function useAddHomepageSection() {
  return useDraftMutation((input: CreateHomepageSectionInput) =>
    apiRequest<HomepageDraft>(endpoints.sections, { method: "POST", body: input }),
  );
}

export function useUpdateHomepageSection() {
  return useDraftMutation(({ id, ...input }: HomepageSectionInput & { id: string }) =>
    apiRequest<HomepageDraft>(endpoints.section(id), { method: "PUT", body: input }),
  );
}

export function useDeleteHomepageSection() {
  return useDraftMutation((id: string) =>
    apiRequest<HomepageDraft>(endpoints.section(id), { method: "DELETE" }),
  );
}

export function useReorderHomepageSections() {
  return useDraftMutation((ids: string[]) =>
    apiRequest<HomepageDraft>(endpoints.order, { method: "PUT", body: { ids } }),
  );
}

export function usePublishHomepage() {
  return useDraftMutation(() => apiRequest<HomepageDraft>(endpoints.publish, { method: "POST" }));
}

export function useDiscardHomepageDraft() {
  return useDraftMutation(() => apiRequest<HomepageDraft>(endpoints.discard, { method: "POST" }));
}
```

Before writing, open one route under `src/app/api/v1/admin/homepage/` (for example `publish/route.ts` and `sections/[id]/route.ts` DELETE) and confirm each answers `apiSuccess(draft)`. The doc says every route answers with the whole draft; if any route returns something else, type that hook to match and skip `setQueryData` for it.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/hooks/use-homepage.ts`.

- [ ] **Step 3: Leave changes in the working tree** (no commit).

---

### Task 3: Stage aware read and shared sections renderer

**Files:**
- Modify: `src/services/homepage.service.ts` (the `getPublishedHomepage` function near line 308)
- Create: `src/components/home/homepage-sections.tsx`
- Modify: `src/app/(site)/page.tsx`

**Interfaces:**
- Produces: `getHomepageSections(stage: "DRAFT" | "LIVE"): Promise<PublishedSection[]>`; `getPublishedHomepage()` unchanged in signature; `HomepageSections({ sections }: { sections: PublishedSection[] })` async server component.

- [ ] **Step 1: Generalise the read**

In `src/services/homepage.service.ts`, replace the storefront block with:

```ts
/* ---------- storefront ---------- */

/** The storefront's homepage: visible live sections. */
export function getPublishedHomepage(): Promise<PublishedSection[]> {
  return getHomepageSections("LIVE");
}

/**
 * Visible sections of `stage` in order, read fresh on every request — not
 * cached. The homepage renders per request anyway (`force-dynamic`), and a
 * cache here outlived the seed (which runs outside Next and can't clear it)
 * and served an empty homepage. Reading fresh also means a renamed,
 * unpublished or deleted brand or category leaves the page immediately.
 * DRAFT feeds the staff preview, LIVE the storefront.
 */
export async function getHomepageSections(stage: Stage): Promise<PublishedSection[]> {
  const rows = await prisma.homepageSection.findMany({
    where: { stage, visible: true },
    select: sectionSelect,
    orderBy: { sortOrder: "asc" },
  });
```

Keep the rest of the former function body (`loadRefs` onwards) exactly as it was.

- [ ] **Step 2: Create the shared renderer**

`src/components/home/homepage-sections.tsx`:

```tsx
import { HomepageSection } from "@/components/home/homepage-section";
import { FEATURED_PRODUCTS_LIMIT } from "@/lib/constants";
import { toFaqEntries } from "@/lib/faq-entry";
import { getPublishedPolicy } from "@/lib/policies";
import { listNewestShopProducts } from "@/services/catalogue.service";
import type { PublishedSection } from "@/types/homepage";

/**
 * A list of homepage sections with the data they share: the FAQ policy's
 * entries and the catalogue's newest products. The homepage and the staff
 * preview both render through this, so the two can't drift.
 */
export async function HomepageSections({ sections }: { sections: PublishedSection[] }) {
  const [faqPolicy, products] = await Promise.all([
    getPublishedPolicy("faq"),
    listNewestShopProducts(FEATURED_PRODUCTS_LIMIT),
  ]);
  const faqs = toFaqEntries(faqPolicy);

  return (
    <>
      {sections.map((section) => (
        <HomepageSection key={section.id} section={section} faqs={faqs} products={products} />
      ))}
    </>
  );
}
```

- [ ] **Step 3: Use it on the homepage**

Replace `src/app/(site)/page.tsx` with:

```tsx
import { HomepageSections } from "@/components/home/homepage-sections";
import { getPublishedHomepage } from "@/services/homepage.service";

export const dynamic = "force-dynamic";

/**
 * The homepage is whatever was last published through the homepage API — see
 * docs/HOMEPAGE-CMS.md. The CMS decides which sections show, in what order,
 * with what copy; product data comes from the catalogue. There is no fallback
 * copy here: an unpublished database renders the header and footer only, and
 * the seed publishes the defaults.
 */
export default async function Home() {
  return <HomepageSections sections={await getPublishedHomepage()} />;
}
```

This now loads sections before FAQ and products instead of all three in parallel. That is one extra round trip on the homepage; accepted for a single shared renderer. If the owner objects, pass the sections promise into `HomepageSections` instead.

- [ ] **Step 4: Type check and tests**

Run: `npx tsc --noEmit` then `npm test`
Expected: no type errors; all existing tests still pass.

- [ ] **Step 5: Leave changes in the working tree** (no commit).

---

### Task 4: Draft preview route

**Files:**
- Modify: `src/lib/constants.ts`
- Create: `src/app/(site)/preview/homepage/page.tsx`

**Interfaces:**
- Consumes: `getHomepageSections("DRAFT")` and `HomepageSections` from Task 3; `getSession` from `@/lib/auth/session`; `PERMISSIONS`, `hasPermission` from `@/lib/auth/permissions`.
- Produces: constants `HOMEPAGE_BUILDER_PATH`, `HOMEPAGE_PREVIEW_PATH`, `FAQ_EDITOR_PATH` in `@/lib/constants` (Task 7 uses all three).

- [ ] **Step 1: Add the path constants**

First run `grep -rn "storefront/content" src/lib` and reuse an existing policy editor path helper for the FAQ link if one exists. Otherwise add to `src/lib/constants.ts`:

```ts
/** The Homepage Builder, the staff draft preview it opens, and the FAQ's editor. */
export const HOMEPAGE_BUILDER_PATH = "/admin/storefront/homepage";
export const HOMEPAGE_PREVIEW_PATH = "/preview/homepage";
export const FAQ_EDITOR_PATH = "/admin/storefront/content/faq";
```

- [ ] **Step 2: Write the route**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomepageSections } from "@/components/home/homepage-sections";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { HOMEPAGE_BUILDER_PATH } from "@/lib/constants";
import { getHomepageSections } from "@/services/homepage.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Homepage preview",
  robots: { index: false, follow: false },
};

/**
 * The homepage draft, rendered with the real site chrome, for staff who can
 * edit it. Anyone else gets a 404, so the route doesn't reveal it exists.
 * See docs/HOMEPAGE-CMS.md.
 */
export default async function HomepagePreview() {
  const session = await getSession();
  if (!session || !hasPermission(session.user.role, PERMISSIONS.homepage)) notFound();

  const sections = await getHomepageSections("DRAFT");

  return (
    <>
      <HomepageSections sections={sections} />
      <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
        <p className="flex items-center gap-3 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm text-ink shadow-lg">
          Draft preview, not published
          <Link href={HOMEPAGE_BUILDER_PATH} className="text-accent underline-offset-4 hover:underline">
            Back to the builder
          </Link>
        </p>
      </div>
    </>
  );
}
```

The bar is fixed to the bottom because the site header is fixed to the top; `bottom-20` clears the phone tab bar. Check `bg-surface`, `border-line-strong` and `shadow-lg` are used elsewhere (`grep -rn "shadow-lg" src/components | head -5`); swap for the nearest existing token if not.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Leave changes in the working tree** (no commit).

---

### Task 5: Ref picker

**Files:**
- Create: `src/components/admin/homepage/ref-picker.tsx`

**Interfaces:**
- Consumes: `useGetBrands`, `useGetCategories`, `flattenCategoryRefs`, `swapItems` (Task 1), `PICKER_PAGE_SIZE`, `SEARCH_DEBOUNCE_MS`, `MAX_SECTION_REFS`, `SectionRef`.
- Produces: `RefPicker({ kind, value, onChange, error }: { kind: "brands" | "categories"; value: SectionRef[]; onChange: (refs: SectionRef[]) => void; error?: string })`.

Each option list is its own small component calling exactly one hook, so only the needed list is fetched.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";
import { useGetBrands } from "@/hooks/use-brand";
import { useGetCategories } from "@/hooks/use-category";
import { PICKER_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { flattenCategoryRefs, swapItems } from "@/lib/homepage-builder";
import { MAX_SECTION_REFS } from "@/lib/homepage-sections";
import type { SectionRef } from "@/types/homepage";

interface RefPickerProps {
  kind: "brands" | "categories";
  /** Chosen items in display order. */
  value: SectionRef[];
  onChange: (refs: SectionRef[]) => void;
  error?: string;
}

/**
 * Chooses the brands or categories a featured section shows. One page of
 * search results is enough to pick from; the chosen list keeps its order and
 * can be rearranged.
 */
export function RefPicker({ kind, value, onChange, error }: RefPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const noun = kind === "brands" ? "brands" : "categories";
  const listProps = { search, value, onChange };

  return (
    <fieldset>
      <legend className="eyebrow">
        {kind === "brands" ? "Brands" : "Categories"} ({value.length}/{MAX_SECTION_REFS})
      </legend>

      {value.length > 0 && (
        <ol className="mt-3 flex flex-col gap-1.5">
          {value.map((ref, index) => (
            <li
              key={ref.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              <span className="min-w-0 flex-1 truncate">{ref.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => onChange(swapItems(value, index, -1))}
                aria-label={`Move ${ref.name} up`}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === value.length - 1}
                onClick={() => onChange(swapItems(value, index, 1))}
                aria-label={`Move ${ref.name} down`}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((item) => item.id !== ref.id))}
                aria-label={`Remove ${ref.name}`}
              >
                ×
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder={`Search ${noun} by name`}
        aria-label={`Search ${noun}`}
        className="mt-3 h-11"
      />

      {kind === "brands" ? <BrandOptions {...listProps} /> : <CategoryOptions {...listProps} />}

      <FieldError className="mt-2">{error}</FieldError>
    </fieldset>
  );
}

interface OptionsProps {
  search: string;
  value: SectionRef[];
  onChange: (refs: SectionRef[]) => void;
}

function BrandOptions({ search, ...props }: OptionsProps) {
  const brands = useGetBrands({ pageSize: PICKER_PAGE_SIZE, search: search || undefined });
  return (
    <OptionList
      {...props}
      noun="brands"
      pending={brands.isPending}
      error={brands.isError ? brands.error.message : null}
      options={(brands.data?.items ?? []).map(({ id, name }) => ({ id, name }))}
    />
  );
}

function CategoryOptions({ search, ...props }: OptionsProps) {
  const categories = useGetCategories({ pageSize: PICKER_PAGE_SIZE, search: search || undefined });
  return (
    <OptionList
      {...props}
      noun="categories"
      pending={categories.isPending}
      error={categories.isError ? categories.error.message : null}
      options={flattenCategoryRefs(categories.data?.items ?? [])}
    />
  );
}

function OptionList({
  noun,
  pending,
  error,
  options,
  value,
  onChange,
}: Omit<OptionsProps, "search"> & {
  noun: string;
  pending: boolean;
  error: string | null;
  options: SectionRef[];
}) {
  if (pending) return <p className="mt-3 text-sm text-ink-muted">Loading…</p>;
  if (error) return <p className="mt-3 text-sm text-danger">{error}</p>;
  if (options.length === 0) return <p className="mt-3 text-sm text-ink-muted">No {noun} match.</p>;

  const chosen = new Set(value.map((ref) => ref.id));
  const full = value.length >= MAX_SECTION_REFS;

  return (
    <ul className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface p-3">
      {options.map((option) => (
        <li key={option.id}>
          <label className="inline-flex items-center gap-2 py-1 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={chosen.has(option.id)}
              disabled={full && !chosen.has(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, option]
                    : value.filter((item) => item.id !== option.id),
                )
              }
            />
            {option.name}
          </label>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Type check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no errors.

- [ ] **Step 3: Leave changes in the working tree** (no commit).

---

### Task 6: Section form modal

**Files:**
- Create: `src/components/admin/homepage/section-form-modal.tsx`

**Interfaces:**
- Consumes: `useAddHomepageSection`, `useUpdateHomepageSection` (Task 2); `sectionToInput`, `emptySectionInput`, `validateSection`, `SectionFormInput` (Task 1); `RefPicker` (Task 5); `ImageField`; `Dialog`, `DialogBody`, `DialogFooter`, `Field`, `Input`, `Textarea`, `Button`; `apiFieldErrors`; `SECTION_RULES`, `sectionFields`, `SECTION_FIELD_LABELS`, `SECTION_TEXT_LIMITS`, `HomepageSectionType`, `AddableSectionType`.
- Produces: `SectionFormModal(props: { section: HomepageSection; onClose: () => void } | { type: AddableSectionType; onClose: () => void })`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useId, useState, type FormEvent } from "react";
import { ImageField } from "@/components/admin/shared/image-field";
import { RefPicker } from "@/components/admin/homepage/ref-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useAddHomepageSection, useUpdateHomepageSection } from "@/hooks/use-homepage";
import { apiFieldErrors } from "@/lib/api/api-client";
import {
  emptySectionInput,
  sectionToInput,
  validateSection,
  type SectionFormInput,
} from "@/lib/homepage-builder";
import {
  SECTION_FIELD_LABELS,
  SECTION_RULES,
  SECTION_TEXT_LIMITS,
  sectionFields,
  type AddableSectionType,
  type HomepageSectionType,
  type SectionTextField,
} from "@/lib/homepage-sections";
import type { HomepageSection, SectionRef } from "@/types/homepage";

type SectionFormModalProps =
  | { section: HomepageSection; type?: never; onClose: () => void }
  | { section?: never; type: AddableSectionType; onClose: () => void };

/** Fields edited in a textarea; the rest are single line inputs. */
const MULTILINE: readonly SectionTextField[] = ["title", "description"];

export function SectionFormModal({ section, type, onClose }: SectionFormModalProps) {
  const sectionType = section?.type ?? type!;
  const label = SECTION_RULES[sectionType].label;
  return (
    <Dialog open onClose={onClose} title={section ? `Edit ${label}` : `Add ${label}`}>
      <SectionForm type={sectionType} initial={section} onClose={onClose} />
    </Dialog>
  );
}

function SectionForm({
  type,
  initial,
  onClose,
}: {
  type: HomepageSectionType;
  initial?: HomepageSection;
  onClose: () => void;
}) {
  const id = useId();
  const rule = SECTION_RULES[type];
  const [form, setForm] = useState<SectionFormInput>(() =>
    initial ? sectionToInput(initial) : emptySectionInput(),
  );
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? null);
  const [refs, setRefs] = useState<SectionRef[]>(initial?.refs ?? []);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const addSection = useAddHomepageSection();
  const updateSection = useUpdateHomepageSection();
  const mutation = initial ? updateSection : addSection;

  function set<K extends keyof SectionFormInput>(key: K, value: SectionFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { ...form, refIds: refs.map((ref) => ref.id) };

    const localErrors = validateSection(type, body);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    const callbacks = {
      onSuccess: () => onClose(),
      onError: (error: Error) => setErrors(apiFieldErrors(error)),
    };
    if (initial) updateSection.mutate({ id: initial.id, ...body }, callbacks);
    else addSection.mutate({ type: type as AddableSectionType, ...body }, callbacks);
  }

  const error = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <div className="grid gap-5">
          {sectionFields(type).map((field) => {
            const inputId = `${id}-${field}`;
            const required = rule.required.includes(field);
            const props = {
              id: inputId,
              value: form[field] ?? "",
              maxLength: SECTION_TEXT_LIMITS[field],
              "aria-invalid": error(field) ? true : undefined,
              onChange: (event: { target: { value: string } }) => set(field, event.target.value || null),
            };
            return (
              <Field
                key={field}
                id={inputId}
                label={required ? SECTION_FIELD_LABELS[field] : `${SECTION_FIELD_LABELS[field]} (optional)`}
                hint={
                  field === "title"
                    ? "A new line starts a new line of the heading."
                    : field === "ctaHref"
                      ? "A site path such as /collection, or an https:// link."
                      : undefined
                }
                error={error(field)}
              >
                {MULTILINE.includes(field) ? (
                  <Textarea rows={field === "title" ? 2 : 4} {...props} />
                ) : (
                  <Input className="h-11" {...props} />
                )}
              </Field>
            );
          })}

          {rule.image && (
            <ImageField
              label="Image (optional)"
              value={form.imageId}
              previewUrl={imageUrl}
              error={error("imageId")}
              onChange={(imageId, url) => {
                set("imageId", imageId);
                setImageUrl(url);
              }}
            />
          )}

          {rule.refs && (
            <RefPicker kind={rule.refs} value={refs} onChange={setRefs} error={error("refIds")} />
          )}

          <div className="flex flex-col gap-3">
            {rule.seasonal && (
              <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={form.seasonal}
                  onChange={(event) => set("seasonal", event.target.checked)}
                />
                Seasonal (shows a &ldquo;Seasonal&rdquo; badge)
              </label>
            )}
            <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(event) => set("visible", event.target.checked)}
              />
              Visible on the homepage
            </label>
          </div>
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
          {initial ? "Save changes" : "Add section"}
        </Button>
      </DialogFooter>
    </form>
  );
}
```

Notes for the implementer:
1. The value typed is kept as typed (no trimming while typing); `homepageSectionSchema` trims on validate and on the server, and turns `""` into null.
2. Check `Field` passes `hint` and `error` through (`src/components/ui/field.tsx`) and that `Textarea` accepts `rows`. Both are standard HTML props.
3. `type!` is safe because the props union guarantees one of `section` or `type`.

- [ ] **Step 2: Type check and lint**

Run: `npx tsc --noEmit` then `npm run lint`
Expected: no errors.

- [ ] **Step 3: Leave changes in the working tree** (no commit).

---

### Task 7: Builder screen and route

**Files:**
- Create: `src/components/admin/homepage/homepage-builder.tsx`
- Create: `src/app/admin/storefront/homepage/page.tsx`
- Modify: `src/app/admin/[...slug]/page.tsx` (`BUILT_ROUTES`, line 14)

**Interfaces:**
- Consumes: every hook from Task 2; `SectionFormModal` (Task 6); `swapItems`, `sectionToInput`, `firstLine` (Task 1); `AdminPage`, `AdminEmptyState`, `RowActions`, `Badge`, `Button`, `ConfirmDialog`, `Skeleton`; `ADDABLE_SECTION_TYPES`, `MAX_HOMEPAGE_SECTIONS`, `SECTION_RULES`, `isAddableSectionType`.
- Consumes also: `HOMEPAGE_PREVIEW_PATH`, `FAQ_EDITOR_PATH` from `@/lib/constants` (Task 4).
- Produces: `HomepageBuilder()`.

- [ ] **Step 1: Write the route**

`src/app/admin/storefront/homepage/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { HomepageBuilder } from "@/components/admin/homepage/homepage-builder";
import { SIGN_IN_PAGE_PATH } from "@/lib/constants";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Homepage Builder" };

export default async function HomepageBuilderPage() {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PAGE_PATH);

  if (!hasPermission(session.user.role, PERMISSIONS.homepage)) {
    return (
      <AdminPage title="Homepage Builder">
        <AdminEmptyState title="Access denied" description="Your role doesn't include the Homepage Builder." />
      </AdminPage>
    );
  }

  return <HomepageBuilder />;
}
```

Add `"/admin/storefront/homepage",` to `BUILT_ROUTES` in `src/app/admin/[...slug]/page.tsx`, after `"/admin/storefront/content",`.

- [ ] **Step 2: Write the builder**

`src/components/admin/homepage/homepage-builder.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AdminEmptyState, AdminPage } from "@/components/admin/admin-page";
import { RowActions } from "@/components/admin/shared/row-actions";
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
import { FAQ_EDITOR_PATH, HOMEPAGE_PREVIEW_PATH } from "@/lib/constants";
import { firstLine, sectionToInput, swapItems } from "@/lib/homepage-builder";
import {
  ADDABLE_SECTION_TYPES,
  MAX_HOMEPAGE_SECTIONS,
  SECTION_RULES,
  isAddableSectionType,
  type AddableSectionType,
} from "@/lib/homepage-sections";
import { cn } from "@/lib/utils";
import type { HomepageDraft, HomepageSection } from "@/types/homepage";
import { SectionFormModal } from "./section-form-modal";

type Modal = { kind: "add"; type: AddableSectionType } | { kind: "edit"; section: HomepageSection } | null;
type Confirm = { kind: "publish" } | { kind: "discard" } | { kind: "delete"; section: HomepageSection } | null;

export function HomepageBuilder() {
  const draft = useGetHomepageDraft();
  const updateSection = useUpdateHomepageSection();
  const deleteSection = useDeleteHomepageSection();
  const reorder = useReorderHomepageSections();
  const publish = usePublishHomepage();
  const discard = useDiscardHomepageDraft();

  const [modal, setModal] = useState<Modal>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const busy = updateSection.isPending || reorder.isPending || deleteSection.isPending;

  function toggleVisible(section: HomepageSection) {
    setActionError(null);
    updateSection.mutate(
      { id: section.id, ...sectionToInput(section), visible: !section.visible },
      // e.g. a featured section whose brands were all deleted: the API asks
      // for at least one, and staff fix it in Edit.
      { onError: (error) => setActionError(`${SECTION_RULES[section.type].label}: ${error.message}`) },
    );
  }

  function move(sections: HomepageSection[], index: number, offset: -1 | 1) {
    setActionError(null);
    reorder.mutate(swapItems(sections.map((section) => section.id), index, offset), {
      onError: (error) => {
        setActionError(error.message);
        void draft.refetch();
      },
    });
  }

  const confirmMutation =
    confirm?.kind === "publish" ? publish : confirm?.kind === "discard" ? discard : deleteSection;

  function runConfirm() {
    if (!confirm) return;
    const onSuccess = () => {
      setConfirm(null);
      confirmMutation.reset();
    };
    if (confirm.kind === "publish") publish.mutate(undefined, { onSuccess });
    else if (confirm.kind === "discard") discard.mutate(undefined, { onSuccess });
    else deleteSection.mutate(confirm.section.id, { onSuccess });
  }

  function cancelConfirm() {
    setConfirm(null);
    confirmMutation.reset();
  }

  let content: ReactNode;
  if (draft.isPending) {
    content = <ListSkeleton />;
  } else if (draft.isError) {
    content = (
      <div role="alert" className="rounded-xl border border-line bg-surface-2 px-6 py-12 text-center">
        <p className="text-sm text-ink-secondary">{draft.error.message}</p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => draft.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (draft.data.sections.length === 0) {
    content = (
      <AdminEmptyState
        title="The homepage has no sections"
        description="Add a section, or discard the draft to return to what is published."
      />
    );
  } else {
    const { sections } = draft.data;
    content = (
      <ol className="overflow-hidden rounded-xl border border-line">
        {sections.map((section, index) => (
          <li key={section.id} className="border-b border-line last:border-b-0">
            <SectionRow
              section={section}
              disabled={busy}
              first={index === 0}
              last={index === sections.length - 1}
              onToggle={() => toggleVisible(section)}
              onMoveUp={() => move(sections, index, -1)}
              onMoveDown={() => move(sections, index, 1)}
              onEdit={() => setModal({ kind: "edit", section })}
              onDelete={
                isAddableSectionType(section.type)
                  ? () => setConfirm({ kind: "delete", section })
                  : undefined
              }
            />
          </li>
        ))}
      </ol>
    );
  }

  const data = draft.data;
  const full = (data?.sections.length ?? 0) >= MAX_HOMEPAGE_SECTIONS;

  return (
    <AdminPage
      title="Homepage Builder"
      description="The storefront homepage's sections, their order and their copy. Changes stay in a draft until you publish."
      actions={
        data && (
          <div className="flex flex-wrap items-center gap-2">
            <PublishStatus draft={data} />
            <Button variant="outline" size="sm" onClick={() => window.open(HOMEPAGE_PREVIEW_PATH, "_blank", "noopener")}>
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.hasUnpublishedChanges || data.publishedAt === null}
              onClick={() => setConfirm({ kind: "discard" })}
            >
              Discard draft
            </Button>
            <Button
              size="sm"
              disabled={!data.hasUnpublishedChanges || data.sections.length === 0}
              onClick={() => setConfirm({ kind: "publish" })}
            >
              Publish
            </Button>
          </div>
        )
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1">Add section</span>
        {ADDABLE_SECTION_TYPES.map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            disabled={!data || full}
            onClick={() => setModal({ kind: "add", type })}
          >
            {SECTION_RULES[type].label}
          </Button>
        ))}
        {full && (
          <p className="text-xs text-ink-muted">The homepage holds at most {MAX_HOMEPAGE_SECTIONS} sections.</p>
        )}
      </div>

      {actionError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {actionError}
        </p>
      )}

      {content}

      <p className="mt-5 text-sm text-ink-secondary">
        The FAQ section&apos;s questions are edited in{" "}
        <Link href={FAQ_EDITOR_PATH} className="text-ink underline-offset-4 hover:underline">
          Content &amp; Policies
        </Link>
        .
      </p>

      {modal && (
        <SectionFormModal
          {...(modal.kind === "edit" ? { section: modal.section } : { type: modal.type })}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === "publish"
            ? "Publish the homepage?"
            : confirm?.kind === "discard"
              ? "Discard the draft?"
              : `Delete ${confirm?.kind === "delete" ? SECTION_RULES[confirm.section.type].label : "section"}?`
        }
        description={
          confirm?.kind === "publish"
            ? "Shoppers see the draft as it is now, straight away."
            : confirm?.kind === "discard"
              ? "Every change since the last publish is lost. The draft goes back to what shoppers see."
              : "It leaves the draft now and the storefront at the next publish."
        }
        confirmLabel={
          confirm?.kind === "publish" ? "Publish" : confirm?.kind === "discard" ? "Discard draft" : "Delete section"
        }
        error={confirmMutation.isError ? confirmMutation.error.message : undefined}
        loading={confirmMutation.isPending}
        onCancel={cancelConfirm}
        onConfirm={runConfirm}
      />
    </AdminPage>
  );
}

function PublishStatus({ draft }: { draft: HomepageDraft }) {
  if (draft.hasUnpublishedChanges) {
    return <Badge variant="warn" className="px-2 py-1 text-[0.625rem]">Unpublished changes</Badge>;
  }
  if (!draft.publishedAt) return <Badge className="px-2 py-1 text-[0.625rem]">Never published</Badge>;
  return (
    <Badge variant="live" className="px-2 py-1 text-[0.625rem]">
      Published{" "}
      {new Date(draft.publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
    </Badge>
  );
}

function SectionRow({
  section,
  disabled,
  first,
  last,
  onToggle,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  section: HomepageSection;
  disabled: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  /** Only added section types can be deleted. */
  onDelete?: () => void;
}) {
  const label = SECTION_RULES[section.type].label;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4", !section.visible && "opacity-60")}>
      <div className="flex flex-col gap-1">
        <Button variant="ghost" size="sm" disabled={disabled || first} onClick={onMoveUp} aria-label={`Move ${label} up`}>
          ↑
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled || last} onClick={onMoveDown} aria-label={`Move ${label} down`}>
          ↓
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <p className="eyebrow">{label}</p>
        <p className="mt-0.5 truncate text-sm text-ink">{firstLine(section.title) || "Untitled"}</p>
      </div>

      <div className="flex items-center gap-2">
        {section.seasonal && <Badge variant="outline" className="px-2 py-1 text-[0.625rem]">Seasonal</Badge>}
        {!section.visible && <Badge className="px-2 py-1 text-[0.625rem]">Hidden</Badge>}
        <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
          <input type="checkbox" checked={section.visible} disabled={disabled} onChange={onToggle} />
          Visible
        </label>
      </div>

      {onDelete ? (
        <RowActions name={label} disabled={disabled} onEdit={onEdit} onDelete={onDelete} />
      ) : (
        <Button variant="outline" size="sm" disabled={disabled} onClick={onEdit} aria-label={`Edit ${label}`}>
          Edit
        </Button>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy className="overflow-hidden rounded-xl border border-line">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
          <Skeleton className="h-8 w-8" />
          <div className="flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
```

Implementer checks:
1. `ConfirmDialog` props at `src/components/ui/confirm-dialog.tsx:189-205`; adjust if `description` or `error` differ.
2. If Task 4 found an existing policy editor path helper, use it instead of `FAQ_EDITOR_PATH`.
3. Use `usePublishHomepage().mutate(undefined, …)`; if React Query's typing complains for a `void` variables mutation, type the mutationFn as `() => …` (already so) and call `mutate(undefined, { onSuccess })`.

- [ ] **Step 3: Type check, lint and tests**

Run: `npx tsc --noEmit`, `npm run lint`, `npm test`
Expected: all pass.

- [ ] **Step 4: Leave changes in the working tree** (no commit).

---

### Task 8: Docs

**Files:**
- Modify: `docs/HOMEPAGE-CMS.md`
- Modify: `docs/ADMIN-PANEL.md`

- [ ] **Step 1: Update `docs/HOMEPAGE-CMS.md`**

1. §1 "Scope": replace the paragraph saying the editing screen "is still the placeholder" with: the editing screen is Storefront → Homepage Builder, `/admin/storefront/homepage`, described in a new section; staff preview the draft at `/preview/homepage`.
2. §1 files table: add rows for `src/lib/homepage-builder.ts` (pure helpers for the builder form and list), `src/hooks/use-homepage.ts` (React Query hooks; key `["homepage"]`; every mutation writes the returned draft into the cache), `src/components/admin/homepage/` (builder screen, section form, brand and category picker), `src/components/home/homepage-sections.tsx` (renders a list of sections with the FAQ and product data; shared by `/` and the preview), `src/app/(site)/preview/homepage/page.tsx` (draft preview).
3. §5: `getPublishedHomepage` is now `getHomepageSections("LIVE")`; `getHomepageSections(stage)` reads either stage, with the same skipping rules.
4. Add a new section "Homepage Builder" (before "Seed") covering, as a numbered list: the toolbar (status, Preview, Discard draft, Publish with their disabled rules), the section list (move up and down, visible toggle, Edit, Delete for added types), the form (fields from `SECTION_RULES`, client checks through `validateSection`, server field errors on the same inputs), the picker (one page of search results, up to 12, ordered), the preview (staff with `storefront.homepage` only; others get 404; noindex; hidden sections left out), and the FAQ note linking to Content & Policies. Mention the known edge: a featured section whose brands or categories were all deleted cannot be shown or hidden until staff choose new ones in Edit.
5. Do not use `-` as a list marker in any new text.

- [ ] **Step 2: Update `docs/ADMIN-PANEL.md`**

In "Homepage CMS" (around line 259), replace the sentence that says the Homepage Builder "is still the placeholder" with: the Homepage Builder at `/admin/storefront/homepage` edits the draft, previews it at `/preview/homepage` and publishes it; see HOMEPAGE-CMS.md.

- [ ] **Step 3: Final verification**

Run: `npm test`, `npx tsc --noEmit`, `npm run lint`
Expected: all pass. Then hand the manual checklist from the spec §7 to the owner (they run the dev server).

- [ ] **Step 4: Leave changes in the working tree** (no commit).
