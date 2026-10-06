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
| `src/lib/auth/permissions.ts` | Roles, modules, actions, the permission checks, and the rules for managing accounts |
| `src/services/role-permission.service.ts` | Loads, caches and saves the Staff permission grid |
| `src/lib/auth/session.ts` | Signed session cookie, `getSession()`, `authorizeApi()` |
| `src/lib/auth/password.ts` | scrypt hashing |
| `src/app/(auth)/sign-in/page.tsx`, `src/app/api/v1/auth/` | Sign-in and sign-out (the same page customers use; see [AUTH.md](AUTH.md)) |

**Permissions.** Admin always holds every action and Customer none. Each
Staff account works under a custom Staff role that an Admin creates on the
**Roles** screen (Governance → Roles, `/admin/roles`) with an access level
per module (No access, View, Edit, Full access), and assigns in Users →
Staff. The full rules, the module list, the
API and the known limits are in [PERMISSIONS.md](PERMISSIONS.md).

**Checks.**

* `src/app/admin/layout.tsx`: signed out → `/sign-in`; a Customer, or Staff
  whose grid grants no module → the access-denied screen instead of the console.
* A built module's page checks View with
  `hasPermission(session.user.permissions, PERMISSIONS.<module>)`.
* Every `/api/v1/admin` route starts with
  `authorizeApi(PERMISSIONS.<module>, "<ACTION>")`: 401 when signed out, 403
  without the action.
* Server Actions check for themselves (`savePolicy`), because they can be
  called directly.
* The sidebar hides modules the user can't view, and each screen hides the
  buttons for actions the user lacks (`useModuleAccess`).

**Sessions** are a signed cookie (`AUTH_SECRET`), seven days. The cookie only
identifies the user and carries their `sessionVersion`; role, state and
version are read from the database on each request, so a role change or a
deletion applies immediately. The full rules, the sign-in rate limit (10
attempts per 15 minutes per IP, staff included) and the known risks are in
[AUTH.md](AUTH.md).

Staff and Admins sign in with a password only: forgot password is for
customers, so an Admin sets console passwords in the Users
screen. Setting a password there does not sign that user out of other
devices. An expired session on any admin screen now redirects to
`/sign-in?next=<the screen>` instead of showing an error.

**Account rules** (`permissions.ts`, enforced in `user.service.ts`): only
Admins give the Admin role, edit or delete Admin accounts, or set passwords;
nobody changes their own role or deletes themselves; the last Admin can't be
removed.

**Setup.** Add to `.env`, then run `npm run db:seed` to create the first Admin:

```
AUTH_SECRET=<32+ random characters>
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_PASSWORD=<10+ characters>
```

`AUTH_SECRET` also derives the key that encrypts the API Credentials below.
Changing it signs everyone out and makes every stored credential unreadable.

Email and the site address are **not** `.env` values. After
the first sign-in, an Admin sets them on the API Credentials screen.

## API Credentials

Governance → **API Credentials** (`/admin/settings/integrations`), permission
key `governance.integrations`.

1. Holds the SMTP settings, sender address and site address, encrypted, and the DEV / LIVE switch. Values are write-only: the screen
   shows set or not set, the last four characters of longer values, and when
   it changed.
2. **Admins only.** API Credentials is an Admin only module, never on a
   Staff role, so Staff don't see the row and the page answers "Access
   denied". Every `/api/v1/admin/integrations` route also checks
   `canManageIntegrations(role)` in `permissions.ts`, true for Admin only, and
   answers 403 "Only Admins can manage integrations." otherwise.

Keys, modes, encryption and the Gmail and Resend setup steps are in
[INTEGRATIONS.md](INTEGRATIONS.md).

## Users

Service → **Users**, with two screens beneath it:

* `/admin/users/staff` — Admin and Staff accounts, the people who reach the
  console. Module `service.staff`, **Admin only**: only Admins create staff,
  assign Staff roles, or delete and restore staff.
* `/admin/users/customers` — Customer accounts. Module `service.customers`,
  which a Staff role can be given.

Both render the same module with a different `group`, and each fetches only its
own accounts (`?group=staff` / `?group=customers`). `/admin/users` redirects to
the customers screen. Staff accounts used to sit under Governance → Staff &
Roles; that row is now just **Roles**, where an Admin creates the custom Staff
roles ([PERMISSIONS.md](PERMISSIONS.md)). Giving an account the Admin or Staff
kind, and a Staff account its role, happens here, in the Staff modal.

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
  be moved between the two screens from the modal, and the API checks Staff
  accounts for any change involving a non customer role (`accountModule`).
* **Staff role:** a Staff account must have one of the custom Staff roles,
  picked in the modal; the list shows its name. See
  [PERMISSIONS.md](PERMISSIONS.md).
* **Addresses** (emirate, street, nearest landmark) are edited inside the modal
  and saved with the account in one transaction. Exactly one is primary: the
  one marked, or the first when none is.
* **Emails** are stored lowercased and must be unique (409 on the email field).
* **Delete is soft:** `state` becomes `INACTIVE`. The account disappears from
  the list and can't sign in; its email stays taken. It waits in Governance →
  Trash → Users, where it can be restored ([TRASH-AUDIT.md](TRASH-AUDIT.md)).

## Change Log and Trash

Governance → **Change Log** (`/admin/change-log`, `governance.change-log`)
lists every recorded admin change with its previous and new values.
Governance → **Trash** (`/admin/trash/products`, `/admin/trash/users`,
`governance.trash`) holds deleted products and accounts for restore. Both are
described in [TRASH-AUDIT.md](TRASH-AUDIT.md).

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
or removing an image deletes the old asset once nothing else — a category, a
brand, a product or a homepage section — points at it. The same endpoint will serve the
homepage's banner images.

## Homepage CMS

The homepage's sections, their draft and published state, and the admin API
under `/api/v1/admin/homepage`, guarded by permission key
`storefront.homepage`. The storefront renders whatever was last published.

The editing screen is Storefront → **Homepage Builder**
(`/admin/storefront/homepage`). It edits the draft (add, edit, hide, reorder,
delete sections), opens a staff only preview of the draft at
`/preview/homepage`, and publishes or discards it.

See [HOMEPAGE-CMS.md](HOMEPAGE-CMS.md) for the model, the API, the section
types and their fields, and what the seed does.

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

## Discount Codes and Delivery Zones

Marketing → **Discount Codes** (`/admin/marketing/coupons`) and Governance →
**Delivery Zones** (`/admin/settings/delivery`). Permission keys
`marketing.coupons` (`PERMISSIONS.coupons`) and `governance.delivery`
(`PERMISSIONS.deliveryZones`). Both pages check their key with
`hasPermission` and show "Access denied" otherwise.

1. **Discount Codes** lists codes with search by code, an Active / Inactive
   filter and pagination. Each row shows the discount, the minimum order,
   redemptions against the usage limit, and a status badge (Active,
   Scheduled, Expired, Disabled, Used up) computed by the server. The modal
   sets code, description, percent or fixed amount, minimum order, start and
   end, active, total and per customer limits, and either "Applies to every
   product" or a list of products and categories. Delete asks for
   confirmation; carts holding the code lose it.
2. **Delivery Zones** is one table of the seven emirates, each with a
   standard and an express fee and delivery window. Edit opens a dialog per
   emirate with a live preview of the window text. A zone never saved shows
   "Not set", and checkout refuses to deliver there. There is no add or
   delete.

The rules, endpoints and the seed are in [CART.md](CART.md) §4 to §6. Seed the
seven zones once per database; note that `npm run db:seed` also overwrites
policies and the homepage and resets the seeded Admin's password
([CART.md](CART.md) §5).

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

The console has a light and a dark palette; the storefront is always dark. It
does not carry a second component library: `.admin-theme` in `globals.css`
redefines the same tokens every component already reads, exactly as the
existing `.theme-dark` and `.commerce-dark` scopes do. A `Card`, `Button` or
`Badge` dropped into an admin page follows the palette with no admin variant
of its own.

**Light and dark.** Every admin token is `light-dark(light, dark)`, so each
value is written once and `color-scheme` picks the side:

1. **Default: follow the OS.** `.admin-theme` sets `color-scheme: light dark`,
   so the browser uses the system setting before first paint.
2. **The toggle.** A sun / moon button in the header (`AdminThemeToggle`,
   `src/components/admin/admin-theme-toggle.tsx`) switches to the opposite of
   what is showing, sets `data-theme="light"` or `"dark"` on the shell (which
   fixes `color-scheme`), and saves the choice in the `rewire_admin_theme`
   cookie for a year (`ADMIN_THEME_COOKIE`,
   `ADMIN_THEME_COOKIE_MAX_AGE_SECONDS` in `src/lib/constants.ts`).
3. **No flash.** `src/app/admin/layout.tsx` reads the cookie and passes it to
   `AdminShell`, so a saved choice is in the server HTML. Values other than
   `light` and `dark` are ignored (`isAdminTheme` in
   `src/lib/admin-console.ts`).
4. **Per browser.** The choice is not stored on the account. Deleting the
   cookie returns to following the OS.

When styling admin UI, use tokens (`bg-ink text-void` for an inverted pill,
not `text-white`), so both palettes stay readable. `text-white` is fine only on
`bg-accent`, which stays dark in both.

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
2. **Lenis smooth scroll still runs.** The site wide scroll driver from the root
   layout applies to the console too. The navigation rail opts out with
   `data-lenis-prevent`. If the console ever feels wrong under it, the provider
   can be moved into the `(site)` group.
