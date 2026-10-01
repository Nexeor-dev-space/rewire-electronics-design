# Homepage Page Builder — design

The admin editing screen for the homepage, built on the existing Homepage CMS
API, plus a draft preview.

Route: `/admin/storefront/homepage`
Builds on: [docs/HOMEPAGE-CMS.md](../../HOMEPAGE-CMS.md) and
[2026-09-24-homepage-cms-design.md](2026-09-24-homepage-cms-design.md)

---

## 1. Goal

Staff with `storefront.homepage` manage the whole homepage from the console:
add, edit, hide, reorder and delete sections, preview the draft, then publish
or discard it. No frontend deployment is needed for a content change.

The backend (models, service, admin API, storefront rendering) already exists.
This work adds the screen, the React Query hooks and a preview.

### In scope

1. React Query hooks for the existing admin homepage API.
2. The Homepage Builder screen, replacing the placeholder.
3. A section form driven by `SECTION_RULES`.
4. A brand and category picker for featured sections.
5. A draft preview rendered with the real storefront layout.
6. Doc updates.

### Out of scope

Agreed with the owner: no schema changes and no migrations.

1. Testimonial content stays in `src/lib/testimonials.ts`.
2. FAQ content stays in the `faq` policy, edited under Content & Policies. The
   builder links there.
3. Curated product sections (product references).
4. Hero, Upcoming drops and Invitation item data (`drops.ts`, owned by Releases, P3).
5. Edit locking between staff, autosave, scheduling.

---

## 2. Hooks

New file `src/hooks/use-homepage.ts`, following `use-brand.ts`. Paths come
from `API_ENDPOINTS.admin.homepage`, which already exists.

| Hook | Call |
| --- | --- |
| `useGetHomepageDraft()` | `GET draft` → `HomepageDraft` |
| `useAddHomepageSection()` | `POST sections` with `CreateHomepageSectionInput` |
| `useUpdateHomepageSection()` | `PUT section(id)` with `HomepageSectionInput` |
| `useDeleteHomepageSection()` | `DELETE section(id)` |
| `useReorderHomepageSections()` | `PUT order` with `{ ids }` |
| `usePublishHomepage()` | `POST publish` |
| `useDiscardHomepageDraft()` | `POST discard` |

Query key `["homepage", "draft"]`. Every mutation answers with the full draft,
so it writes that response into the cache with `setQueryData` and then
invalidates `["homepage"]`.

---

## 3. Admin screen

### Route

`src/app/admin/storefront/homepage/page.tsx` is a Server Component that uses the
same guard as `src/app/admin/marketing/coupons/page.tsx`: no session means a
redirect to sign in, and without `PERMISSIONS.homepage` it shows "Access denied".
Otherwise it renders `HomepageBuilder`. Add `/admin/storefront/homepage` to
`BUILT_ROUTES` in `src/app/admin/[...slug]/page.tsx`.

### Components in `src/components/admin/homepage/`

**`homepage-builder.tsx`** (client): the screen, wrapped in `AdminPage`.

Toolbar:

1. Status: "Unpublished changes" (badge) when `hasUnpublishedChanges`,
   otherwise "Published" with the `publishedAt` date. "Never published" when
   `publishedAt` is null.
2. **Preview** opens `/preview/homepage` in a new tab.
3. **Discard draft** asks for confirmation. It is disabled when there are no
   unpublished changes or nothing has been published.
4. **Publish** asks for confirmation. It is disabled when there are no
   unpublished changes or the draft is empty.

Section list, in draft order. Each row shows:

1. The type label (`SECTION_RULES[type].label`) and the first heading line of
   the title.
2. A badge for hidden sections and for seasonal banners.
3. A visibility toggle. It sends the section's current fields with `visible`
   flipped through `useUpdateHomepageSection`.
4. Move up and move down buttons. They send the whole id list with that row
   swapped through `useReorderHomepageSections`, and are disabled at the ends.
5. **Edit**, which opens the section form.
6. **Delete**, only for addable types, with confirmation.

An **Add section** menu lists `ADDABLE_SECTION_TYPES` and opens an empty
section form for the chosen type. It is disabled at `MAX_HOMEPAGE_SECTIONS`.

A note under the list says the FAQ questions are edited in Content &
Policies, linking to `/admin/storefront/content/faq`.

States: a loading skeleton, an error with a retry button, an empty draft
(a message plus the Add menu), and the data.

Mutation errors show the API's message. A failed reorder (the API answers
422 "The page changed since you loaded it" for a stale list) refetches the
draft.

**`section-form-modal.tsx`** (client): one modal for adding and editing any type.

1. It shows the fields from `sectionFields(type)`, labelled with
   `SECTION_FIELD_LABELS`. Required fields are marked, and each input has
   `maxLength` from `SECTION_TEXT_LIMITS`.
2. The title is a textarea, with a hint that a new line starts a new heading line.
3. Description is a textarea; the other fields are single-line inputs.
4. When `rule.image`, it uses the shared `ImageField` and the existing
   `useUploadImage` to upload.
5. When `rule.seasonal`, a "Seasonal" checkbox.
6. When `rule.refs`, a `RefPicker`.
7. A "Visible" checkbox.
8. Before submitting, it runs `checkSectionFields` and `isSafeHref` on the
   client, so obvious mistakes show without a round trip. Server 422 field
   errors map onto the same inputs.
9. Empty strings are sent as null.

**`ref-picker.tsx`** (client): chooses brands or categories.

1. A search box backed by `useGetBrands` or `useGetCategories` with a search
   filter. It uses the existing pagination, and the first page is enough to
   pick from.
2. The chosen list keeps display order. Each item can be moved up or down and
   removed. At most `MAX_SECTION_REFS` (12).
3. Chosen items show by name. The draft response already carries `SectionRef`
   names, so ids that were saved earlier display without extra requests.

### Reuse

`AdminPage`, `AdminEmptyState`, `ImageField`, `RowActions` where it fits, the
`ui/` primitives, the existing modal pattern from `coupon-form-modal.tsx`,
and `SECTION_RULES` with its helpers. No new dependencies; reordering uses
buttons, not drag and drop.

---

## 4. Preview

### Service

In `src/services/homepage.service.ts`, the body of `getPublishedHomepage()`
becomes `getHomepageSections(stage: HomepageStage)`. It reads the visible rows
of that stage in order, with the same ref loading and the same skipping of
empty sections. `getPublishedHomepage()` stays as
`getHomepageSections("LIVE")`, so the storefront is unchanged.

### Route

`src/app/(site)/preview/homepage/page.tsx`, a Server Component inside the site
layout, so it renders with the real header and footer.

1. `getSession()`. When there is no session, or the role lacks
   `PERMISSIONS.homepage`, it calls `notFound()`, so the route doesn't reveal
   that it exists.
2. `force-dynamic`, and metadata `robots: { index: false, follow: false }`.
3. It loads the draft sections, the FAQ policy and the newest products the
   same way as `src/app/(site)/page.tsx`, and renders them with
   `HomepageSection`.
4. A thin bar above the sections reads "Draft preview — not published" and
   links back to `/admin/storefront/homepage`.

So that the page and the preview can't drift, the shared loading (FAQ entries
and products) and the section map move into a small server component,
`src/components/home/homepage-sections.tsx`, which takes `sections`. Both
routes render it.

Hidden draft sections are left out of the preview, as they would be once
published.

---

## 5. Data flow

Edit in the modal, then the `PUT` returns the draft, which updates the cache
and the list. Preview reads the DRAFT rows straight from the database. Publish
copies DRAFT to LIVE (the existing service), and the storefront reads LIVE on
the next request.

---

## 6. Docs

1. `docs/HOMEPAGE-CMS.md`: the builder screen replaces the "still the
   placeholder" note; add the preview route, `getHomepageSections`, the
   `homepage-sections.tsx` component and the hooks to the files table.
2. `docs/ADMIN-PANEL.md`: the Homepage Builder is built; mention the preview.

---

## 7. Verification

1. `npm run lint` and a type check pass.
2. Manual checks by the owner:
   1. Edit a title and add a line break; the preview shows the break and the
      live homepage doesn't change until Publish.
   2. Add a promo banner with an image, publish, and it appears on `/`.
   3. Add featured brands, reorder them, publish, and the order matches.
   4. Hide a section, move one up; the preview reflects both.
   5. Discard returns the draft to the live state.
   6. Signed out or as a customer, `/preview/homepage` is 404 and the builder
      redirects or denies access.
