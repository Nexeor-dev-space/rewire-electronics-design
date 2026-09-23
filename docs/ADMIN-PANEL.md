# Admin Panel

The staff console at `/admin`. This document covers what was built, why it is
shaped this way, and how to add to it.

## What this is

The admin panel's information architecture, shell and placeholder pages. It
establishes every navigation section, every module route and the reusable frame
they all sit in. It deliberately implements no module functionality: no CRUD, no
data, no reporting. Each module is a separate issue; sign-in, roles and the
Users module are described under [Access control](#access-control) and
[Users](#users).

## What was added

### Files added

| File | Purpose |
| --- | --- |
| `src/lib/admin-nav.ts` | Central navigation config, route resolution, breadcrumbs |
| `src/lib/admin-console.ts` | Console chrome copy and dashboard metric placeholders |
| `src/components/admin/admin-shell.tsx` | The frame: rail, drawer, header, content column |
| `src/components/admin/admin-nav.tsx` | The navigation list, rendered from the config |
| `src/components/admin/admin-breadcrumbs.tsx` | Breadcrumb trail derived from the current path |
| `src/components/admin/admin-page.tsx` | Page header and empty state |
| `src/components/admin/admin-user-menu.tsx` | Staff menu in the header |
| `src/app/admin/layout.tsx` | Admin route group, wraps everything in the shell |
| `src/app/admin/page.tsx` | Dashboard |
| `src/app/admin/[...slug]/page.tsx` | Placeholder route for every declared module |
| `src/app/admin/not-found.tsx` | Admin 404, rendered inside the shell |

### Files modified

`src/app/globals.css` gained one block: the `.admin-theme` token scope.

No existing component, page or library was changed. The storefront is untouched.

## Navigation configuration

`src/lib/admin-nav.ts` is the single source of truth. The sidebar, the
breadcrumbs and the placeholder route all read from it, and none of them knows
what a module is called.

Adding a module means adding one entry:

```ts
{
  key: "bundles",
  label: "Bundles",
  href: "/admin/bundles",
  description: "Device and add-on bundles offered at checkout.",
}
```

That gives you, with no other edit anywhere: a sidebar row in the right section,
an active state, a breadcrumb trail, a working route, a placeholder page and a
prerendered entry in the build output.

### Shape

```
AdminNavSection  area, label, glyph, items[]
  AdminNavItem   key, label, href, description, routes?, children?
```

`routes` lists extra paths a module owns when its screens do not share one
prefix, for example Warranty and Claims. `children` nests secondary rows, which
today is only Trash.

### Route resolution

A declared route owns itself and everything beneath it. `/admin/orders` owns
`/admin/orders/1042`, so the detail and form screens each module grows later
resolve with the parent's navigation row active and a correct breadcrumb trail,
without being declared. When two routes both match, the longer one wins, which
is how `/admin/products/inventory` is its own module while living under
`/admin/products`.

Three helpers cover everything:

* `matchAdminRoute(pathname)` returns the owning section, item, parent and any
  trailing segments.
* `isAdminItemActive(match, item)` decides whether a navigation row reads as
  active. A child page keeps its parent active through this.
* `getAdminBreadcrumbs(pathname)` builds the trail from the same match.

## Access control

Every account is a `User` (`prisma/schema/user.prisma`) with a role: `ADMIN`,
`STAFF` or `CUSTOMER`.

| File | Purpose |
| --- | --- |
| `src/lib/auth/permissions.ts` | Roles, `ROLE_PERMISSIONS`, and the rules for managing accounts |
| `src/lib/auth/session.ts` | Signed session cookie, `getSession()`, `authorizeApi()` |
| `src/lib/auth/password.ts` | scrypt hashing |
| `src/app/sign-in/page.tsx`, `src/app/api/v1/auth/` | Sign-in and sign-out |

**Permissions.** `ROLE_PERMISSIONS` lists the `adminPermission(area, key)` keys
each role may use, or `"*"` for all. Admin and Staff currently have `"*"`,
Customer has none. When the staff permission system is specified, narrow Staff
there; the checks below already read it.

**Checks.**

* `src/app/admin/layout.tsx` — signed out → `/sign-in`; a role with no
  permissions → the access-denied screen instead of the console.
* A built module's page checks its own key with `hasPermission`.
* Every `/api/v1/admin` route starts with `authorizeApi(PERMISSIONS.<module>)`:
  401 when signed out, 403 without the permission.
* Server Actions check for themselves (`savePolicy`), because they can be
  called directly.

**Sessions** are a signed cookie (`AUTH_SECRET`), seven days. The cookie only
identifies the user; role and state are read from the database on each
request, so a role change or a deletion applies immediately.

**Account rules** (`permissions.ts`, enforced in `customer.service.ts`): only
Admins give the Admin role, edit or delete Admin accounts, or set passwords;
nobody changes their own role or deletes themselves; the last Admin can't be
removed.

**Setup.** Add to `.env`, then run `npm run db:seed` to create the first Admin:

```
AUTH_SECRET=<32+ random characters>
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_PASSWORD=<10+ characters>
```

## Users

Service → **Users**, with two screens beneath it:

* `/admin/users/staff` — Admin and Staff accounts, the people who reach the console
* `/admin/users/customers` — Customer accounts

Both render the same module with a different `group`, and each fetches only its
own accounts (`?group=staff` / `?group=customers`). `/admin/users` redirects to
the customers screen. Staff accounts used to sit under Governance → Staff &
Roles; that row is now just **Roles**, for the roles themselves.

| File | Purpose |
| --- | --- |
| `src/app/admin/users/{staff,customers}/page.tsx` | Permission check, renders the module with its group |
| `src/components/admin/users/` | List, modal, address editor |
| `src/hooks/use-user.ts` | Queries and mutations |
| `src/app/api/v1/admin/users/` | `GET`/`POST` list, `GET`/`PATCH`/`DELETE` one |
| `src/services/user.service.ts` | Queries and rules |
| `src/validators/user.validator.ts` | One schema for create and update |

* Each screen has its own search and pagination, an add/edit modal and delete.
* **Roles on offer follow the screen:** Staff offers Admin and Staff (Admin
  only gives out Admin); Customers offers Customer alone. So an account can't
  be moved between the two screens from the modal.
* **Addresses** (emirate, street, nearest landmark) are edited inside the modal
  and saved with the account in one transaction. Exactly one is primary: the
  one marked, or the first when none is.
* **Emails** are stored lowercased and must be unique (409 on the email field).
* **Delete is soft:** `state` becomes `INACTIVE`. The account disappears from
  the list and can't sign in; its email stays taken.

## Categories and Brands

Catalogue → **Categories** (`/admin/categories`) and **Brands**
(`/admin/brands`). Permission keys `catalogue.categories` and
`catalogue.brands`.

| File | Purpose |
| --- | --- |
| `src/app/admin/{categories,brands}/page.tsx` | Permission check, renders the module |
| `src/components/admin/{categories,brands}/` | List and add/edit modal |
| `src/components/admin/shared/` | `ImageField`, and the row bits both tables share |
| `src/hooks/use-category.ts`, `use-brand.ts`, `use-upload.ts` | Queries and mutations |
| `src/app/api/v1/admin/{categories,brands}/` | `GET`/`POST` list, `GET`/`PUT`/`DELETE` one; `PATCH categories/[id]/status` |
| `src/app/api/v1/uploads/images/`, `src/app/api/v1/media/[id]/` | Upload and serve images |
| `src/services/{category,brand,media}.service.ts` | Queries and rules |
| `prisma/schema/catalogue.prisma`, `media.prisma` | `Category`, `Brand`, `MediaAsset` |

**Categories are two levels.** A category with `parentId` null is a parent,
anything else is a child. The `type` the API returns is *derived* from
`parentId` and never stored, so the two cannot disagree. The service refuses a
third level: a category that already has children can't be given a parent, and
a child can't be somebody's parent.

**The list nests.** `GET /api/v1/admin/categories` returns a page of parents,
each carrying its `children`, so the screen renders the mapping rather than
implying it. Pagination therefore walks parents, not categories. `?type=parent`
returns a flat page instead — that is what fills the modal's parent picker.
Search matches both levels: a hit on a child brings back its parent carrying
only the matching children.

**Names are unique across the whole table**, through a `nameKey` column
holding the trimmed, lowercased name. The obvious constraint,
`@@unique([parentId, name])`, does not work — Postgres treats every NULL
`parentId` as distinct, so two top-level categories with the same name would
both insert. A duplicate answers 409 on the `name` field.

**Status, position and menus.** A category is Draft, Published or Archived
(new ones default to Published), set in the modal or from the select on its
row. Only published categories reach the storefront, and a child is hidden when
its parent is. Position (`sortOrder`, lower first, then name) orders the admin
list, the shop filters and the storefront menus. On a parent, "Show in the
storefront menus and home page" (`showInNav`) decides whether it appears in the
header, mega menus, mobile drawer and home strip; unticked, it stays browsable.
The description (up to 300 characters) shows in the menus and on the category
page. Every write refreshes the cached storefront menus, see
[CATALOGUE.md](CATALOGUE.md) §5.

**Deleting** a parent that still has children is refused (409) and the message
names the count; the confirm dialog stays open and shows it. A category or
brand that still has products is refused the same way, naming the product
count.

**Images** go to `MediaAsset` (bytes in Postgres) behind
`src/lib/storage/image-storage.ts`, so a move to object storage is one driver
and no caller changes. One upload endpoint serves both modals. Uploading
happens as soon as a file is chosen, which is what makes a real progress figure
possible; an image uploaded into a modal that is then cancelled is collected by
a sweep of unreferenced assets older than 24 hours, run on each upload. Changing
or removing an image deletes the old asset once nothing else points at it.

## Products, Add-ons and Inventory

Catalogue → **Products** (`/admin/products`), **Inventory**
(`/admin/products/inventory`) and **Add-ons** (`/admin/add-ons`). Permission
keys `catalogue.products`, `catalogue.inventory` and `catalogue.add-ons`. The
upload route also accepts the products permission, so the product form can
upload images.

1. **Products** lists, creates, edits, publishes, unpublishes, archives and
   deletes products. The form holds details, images (each with an optional
   colour), specs and a variants editor.
2. **Inventory** is a paged list of variants, filterable to low or out of
   stock, with the stock count edited in place.
3. **Add-ons** lists and edits the extras offered on the product page, and the
   categories each one applies to.

The rules, endpoints and data model are in [CATALOGUE.md](CATALOGUE.md).

## The shell

`AdminShell` wraps every admin page through `src/app/admin/layout.tsx`. It
provides the sidebar, the header, the staff menu, the content container and the
responsive behaviour. `AdminPage` provides the breadcrumbs, page title,
description and action slot inside it.

A module page therefore looks like this and inherits the whole console:

```tsx
export default function ProductsPage() {
  return (
    <AdminPage title="Products" description="..." actions={<Button>New product</Button>}>
      {/* the module */}
    </AdminPage>
  );
}
```

### Responsive behaviour

| Width | Navigation |
| --- | --- |
| `lg` and above | Fixed 18rem rail, always visible |
| Below `lg` | Drawer behind the header's menu button |

Both render the same `AdminNavList`, so the two navigations cannot drift apart.
The drawer closes on navigation, on Escape and on a click outside, and locks
page scroll while open.

### Theme

The console is light while the storefront is dark. It does not carry a second
component library: `.admin-theme` in `globals.css` redefines the same tokens
every component already reads, exactly as the existing `.theme-dark` and
`.commerce-dark` scopes do. A `Card`, `Button` or `Badge` dropped into an admin
page comes out light with no admin variant of its own.

## Routes

`/admin` is the dashboard. Every other declared module is served by
`src/app/admin/[...slug]/page.tsx`, which resolves the path against the
navigation config and renders the placeholder.

One catch-all rather than roughly forty near identical files, because the
placeholder content is identical and generated from the config. Building a real
module stays purely additive: create `src/app/admin/products/page.tsx` and the
static segment takes precedence over the catch-all automatically, with nothing
to unpick.

`generateStaticParams` lists every module route. Because the admin layout reads
the session cookie, they render per request rather than being served static.
A built module adds its route to `BUILT_ROUTES` so the catch-all stops listing it.

## Dashboard

Four operational indicators, declared in `src/lib/admin-console.ts`: Orders
Today, Live Release, Open Warranty Claims and Low Stock. Each shows a placeholder
figure rather than a number, so the screen cannot show a value it did not count.
Wiring one up means replacing the placeholder with the module's own query. No
reporting or analytics is present, as the issue specifies.

## Known technical debt

1. **404 status on unknown admin paths.** Next 15.5 does not set a 404 status
   for `notFound()` raised inside a catch-all route. A path no module owns
   renders the admin not-found screen correctly but answers HTTP 200. Verified
   against a normal segment under the same layout, which does answer 404. This
   resolves itself as modules land and claim their own static segments.
2. **The storefront still uses the stand-in session.** `/sign-in` issues a real
   session, but `AccountProvider` and the `/account` pages still use the
   localStorage demo user.
3. **Sign-in has no rate limiting**, and there is no sign-up or password reset.
4. **Lenis smooth scroll still runs.** The site wide scroll driver from the root
   layout applies to the console too. The navigation rail opts out with
   `data-lenis-prevent`. If the console ever feels wrong under it, the provider
   can be moved into the `(site)` group.
