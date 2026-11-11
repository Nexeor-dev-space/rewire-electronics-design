# Navigation management

Staff manage the header About menu, the extra header links, the footer and the
mobile bottom bar from Storefront, Navigation (`/admin/storefront/navigation`)
without a code change. Issue #148.

Read this before changing a menu link, the footer, the mobile tab bar, or how
the storefront reads them.

Permission key: `storefront.navigation` (`PERMISSIONS.navigation`), actions
View, Edit and Publish. No new role: any role given access to Navigation can use it.

## 1. What it is

A Navigation screen with three tabs (Header, Footer, Mobile bar), a draft,
a staff preview, publish and restore. The storefront reads the published
version on every page load, so a publish shows on the next load with no deploy.

**One step is left to a developer: the migration.** The model is in
`prisma/schema/navigation.prisma` and the client is generated, but no migration
file exists. Run `npm run db:migrate -- --name add_navigation_state` locally and
commit the folder, then `npm run db:deploy` in deployment (docs/COMMANDS.md).
Until it is applied:

1. The storefront still renders, with the default navigation (§4), because
   `getPublishedNavigation` falls back to it if the read fails.
2. The Navigation screen shows its error state, and saving fails.

No seed is needed. With no row, or no live version, the storefront shows
`defaultNavigation()`, which is today's navigation with the dead footer links
corrected. The first Publish stores the draft as live and keeps the default
as the previous version.

## 2. Shape of the data

Types are in `src/types/navigation.ts`.

| Type | Holds |
| --- | --- |
| `NavLinkItem` | `id`, `label`, `href`, `visible` |
| `NavGroup` | `id`, `title`, `visible`, `links` |
| `MobileTab` | a `NavLinkItem` plus `icon` |
| `NavigationConfig` | `header.aboutColumns`, `header.extraLinks`, `footer.columns`, `footer.bottomLinks`, `mobileBar.tabs` |

A hidden link stays in the config and is dropped by `toPublishedNavigation`,
which also drops any group left with no visible links.

## 3. Limits

All in `src/lib/constants.ts`. They are shown on the screen so staff never
discover them on save, and the schema enforces them.

| Constant | Value | Why |
| --- | --- | --- |
| `NAV_ABOUT_COLUMNS_MAX` | 2 | The About panel is a 12 column grid: two columns and the support box |
| `NAV_FOOTER_COLUMNS_MAX` | 4 | Fits the footer grid beside the brand block |
| `NAV_LINKS_PER_GROUP_MAX` | 8 | Keeps a column short |
| `NAV_EXTRA_HEADER_LINKS_MAX` | 3 | The category rail must not overflow |
| `NAV_FOOTER_BOTTOM_LINKS_MAX` | 4 | One line in the bottom bar |
| `NAV_MOBILE_TABS_MAX` | 5 | Five tabs is what the bar was designed for |
| `NAV_LABEL_MAX_LENGTH` | 40 | Label and group title |
| `NAV_HREF_MAX_LENGTH` | 300 | Link address |

## 4. Defaults and link targets

File: `src/lib/navigation-config.ts` (client safe, unit tested in
`navigation-config.test.ts`).

`defaultNavigation()` is the first published version:

1. Header About menu: The Company (Our Story, Terms, Privacy) and Help and
   Policies (the support sections). No extra header links.
2. Footer: Shop, Brand and Support columns, and Privacy and Terms in the bottom bar.
3. Mobile bar: Home, Categories, Cart, Wishlist, Account, with the existing icons.

Footer links that pointed at pages that do not exist were corrected:

| Was | Now |
| --- | --- |
| Collection, to `/` | `/collection` |
| Archive, to `/` | Removed, there is no such page |
| The Process, Certification, Journal | Removed, there are no such pages. Brand keeps Our Story |

**Link targets.** `POLICY_LINK_TARGETS` and `PAGE_LINK_TARGETS` feed the picker.
A target can also be typed: a site path starting with `/`, or a full `https://`
address. `linkTargetError(href, allowCategories)` explains a refusal and reuses
`isSafeHref` from the homepage rules (no `//host`, no whitespace or backslash).
The categories sentinel `CATEGORIES_TAB_HREF` (`#categories`) is accepted only on
a mobile tab.

## 5. Validation

`navigationSchema` in `src/validators/navigation.validator.ts` checks a whole
navigation: label length, link rules, the icon name and every limit in §3.
Errors carry the field path so the screen can show them on the right input.

## 6. How the storefront reads it

| Surface | File | Reads |
| --- | --- | --- |
| Layout | `src/app/(site)/layout.tsx` | `getPublishedNavigation()` once per request, passed to `NavigationProvider` and to `Footer` |
| About menu | `AboutMenu` in `components/layout/mega-panels.tsx` | `useNavigation().header.aboutColumns` |
| Extra header links | `components/layout/category-bar.tsx` | `header.extraLinks`, shown before About |
| Mobile drawer | `components/layout/mobile-drawer.tsx` | `getDrawerSections(categories, header)` in `lib/navigation.ts` |
| Footer | `components/layout/footer.tsx` | `footer.columns` and `footer.bottomLinks`, as a prop |
| Mobile bar | `components/layout/mobile-tab-bar.tsx` | `mobileBar.tabs` |

**Mobile tab behaviour follows the tab's link, not its position**, so staff can
reorder or replace tabs and keep it:

1. A link of `#categories` opens the category list popup.
2. A link to `/cart` shows the live item count.
3. A link to `/wishlist` shows the saved count.
4. A link to `/account` goes to the account when signed in, and opens the sign in
   panel (Sign in, Track Order) when signed out.
5. Any other link is a plain tab, active on its own path.

**Icons.** `MobileTabIcon` in `src/types/navigation.ts` lists the names staff can
pick, and `MOBILE_TAB_ICON_COMPONENTS` in `components/layout/nav-icons.tsx` maps
each to its drawing. The five existing icons are unchanged. To offer another,
add the name and a component.

Removed from code: `footerNav` (`lib/site.ts`) and `aboutColumns` and
`aboutMenuLinks` (`lib/navigation.ts`). `upcomingDropsLink` and
`editorialNavLink` remain: the Upcoming Drops and About triggers are fixed, and
only the About panel's contents are managed.

## 7. Storage and draft flow

`NavigationState` (`prisma/schema/navigation.prisma`), table `navigation_state`,
one row with id `navigation`:

| Column | Type | Purpose |
| --- | --- | --- |
| `draft` | Json | What staff are editing |
| `live` | Json, nullable | What the storefront reads. Null means the default |
| `previous` | Json, nullable | The version the last publish or restore replaced |
| `publishedAt` | DateTime, nullable | When the live version went live |

JSON rather than rows because navigation holds no images or foreign keys, which
is the only reason the homepage uses rows. Every stored version is checked
against `navigationSchema` when read; one that fails is ignored.

`src/services/navigation.service.ts`:

| Function | Does |
| --- | --- |
| `getNavigationDraft` | The draft, `hasUnpublishedChanges` (draft differs from live), `publishedAt`, `canRestore` |
| `saveNavigationDraft` | Replaces the whole draft |
| `publishNavigation` | `previous` becomes the old live, `live` becomes the draft. 409 when they already match |
| `restorePreviousNavigation` | `live` and `draft` become `previous`, and the replaced live becomes the new `previous`, so a restore can be undone. Edits in the draft are lost. 409 when nothing was replaced |
| `discardNavigationDraft` | The draft goes back to what is live |
| `getPublishedNavigation` | The storefront read, hidden links and empty groups removed |
| `getDraftPreviewNavigation` | The same, for the draft |

Every write locks the row first (`lockNavigation`, which also creates it on a
fresh database), so two publishes cannot interleave. Two people editing at once
overwrite each other's draft, as on the homepage. Publish and restore call
`revalidatePath("/", "layout")`; the `(site)` layout is dynamic, so the change
shows on the next page load.

## 7.1 Admin API

Every route answers with the whole `NavigationDraft`. Signed out is 401, without
the permission 403, a bad body 422 with field errors keyed by path, for example
`footer.columns.0.links.1.href`.

| Route | Permission | Does |
| --- | --- | --- |
| `GET /api/v1/admin/navigation` | View | The draft |
| `PUT /api/v1/admin/navigation` | Edit | Save the draft (body is a `NavigationConfig`) |
| `POST /api/v1/admin/navigation/publish` | Publish | Draft to live. Change log: Published |
| `POST /api/v1/admin/navigation/restore` | Publish | Previous to live. Change log: Restored |
| `POST /api/v1/admin/navigation/discard` | Publish | Draft back to live. Change log: Discarded draft |

Saving a draft is not logged; each publish, restore and discard is, with who and
when, under the Navigation module. Hooks are in `src/hooks/use-navigation.ts`,
endpoints under `API_ENDPOINTS.admin.navigation`.

## 7.2 The screen

`/admin/storefront/navigation`, `src/components/admin/navigation/`.

1. Edits are held on the page until **Save draft**. A badge shows Unsaved edits,
   Unpublished changes, Published with a date, or Original navigation.
2. **Preview** opens the storefront showing the draft (§7.3). It is disabled while
   there are unsaved edits. **Publish** is disabled until the draft is saved and
   differs from live. **Restore previous** and **Discard draft** ask first.
3. Add, rename, hide, reorder (arrows) and delete work on groups, links and tabs.
   Each list shows `n of max` beside its Add button, and Add is disabled at the
   limit. The same limits come from the schema, and errors show on the field.
4. The link picker offers Policy pages, Storefront pages and, on a mobile tab, the
   category list; anything else is typed as an address. A mobile tab also has an
   icon picker.
5. Without Edit the fields lock; without Publish the Publish, Restore previous and
   Discard buttons are hidden (docs/PERMISSIONS.md).
6. Loading shows a skeleton; a failed load shows the message and Try again.

## 7.3 Preview

`GET /preview/navigation` (`src/app/preview/navigation/route.ts`) sets a
session cookie, `nav_preview`, and redirects to `/`; `?exit=1` clears it and
returns to the screen. The `(site)` layout only looks at the session when that
cookie is present, and shows the draft only if the session holds Navigation
access, so the cookie alone grants nothing and ordinary visitors cost nothing.
Previewing shows a bar at the foot with Back to Navigation and Exit preview. The
route answers 404 to anyone without access.

## 8. Dependencies

Policy pages (link picker), the change log (`recordAudit` on publish, see
[TRASH-AUDIT.md](TRASH-AUDIT.md)), and the Homepage CMS draft and publish
pattern ([HOMEPAGE-CMS.md](HOMEPAGE-CMS.md) §2) as the reference.
