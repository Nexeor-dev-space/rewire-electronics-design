# Admin Panel

The staff console at `/admin`. This document covers what was built, why it is
shaped this way, and how to add to it.

## What this is

The admin panel's information architecture, shell and placeholder pages. It
establishes every navigation section, every module route and the reusable frame
they all sit in. It deliberately implements no module functionality: no CRUD, no
data, no reporting. Each module is a separate issue; sign-in, roles and the
Customers module are described under [Access control](#access-control) and
[Customers](#customers).

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

## Customers

`/admin/customers` — list with search and pagination, add/edit modal, delete.

| File | Purpose |
| --- | --- |
| `src/app/admin/customers/page.tsx` | Permission check, renders the module |
| `src/components/admin/customers/` | List, modal, address editor |
| `src/hooks/use-customer.ts` | Queries and mutations |
| `src/app/api/v1/admin/customers/` | `GET`/`POST` list, `GET`/`PATCH`/`DELETE` one |
| `src/services/customer.service.ts` | Queries and rules |
| `src/validators/customer.validator.ts` | One schema for create and update |

* **Addresses** (emirate, street, nearest landmark) are edited inside the modal
  and saved with the customer in one transaction. Exactly one is primary: the
  one marked, or the first when none is.
* **Emails** are stored lowercased and must be unique (409 on the email field).
* **Delete is soft:** `state` becomes `INACTIVE`. The account disappears from
  the list and can't sign in; its email stays taken.

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
