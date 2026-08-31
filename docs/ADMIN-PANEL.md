# Admin Panel

The staff console at `/admin`. This document covers what was built, why it is
shaped this way, and how to add to it.

## What this is

The admin panel's information architecture, shell and placeholder pages. It
establishes every navigation section, every module route and the reusable frame
they all sit in. It deliberately implements no module functionality: no CRUD, no
data, no reporting, no RBAC. Each module is a separate issue.

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

## Permission readiness

No RBAC is implemented, as the issue specifies. The structure for it is in
place:

* Every section carries an `area`, one of the eight operational areas. Staff
  access is specified as configurable by area, so this is the coarse half of the
  key.
* `adminPermission(area, key)` produces the key for any row, for example
  `catalogue.products`.

When the staff permission system arrives it filters `adminNav` before render to
control which rows appear, checks the same key in the route to control access,
and checks it again to decide whether a screen is editable or read only. The
navigation model does not need to change shape for any of that.

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

All 41 module routes are prerendered through `generateStaticParams`, so they are
static rather than server rendered per request, and the build output lists them.
That listing is the route verification: a route that stops resolving shows up in
CI.

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
2. **The staff identity is a placeholder.** `adminConsole.staff` is static. It is
   deliberately not wired to the shopper session in `AccountProvider`, which is
   a different account entirely. Admin authentication is its own issue, and the
   header menu's "Leave console" simply returns to the storefront.
3. **No route guard.** `/admin` is publicly reachable. Access control arrives
   with admin authentication.
4. **Lenis smooth scroll still runs.** The site wide scroll driver from the root
   layout applies to the console too. The navigation rail opts out with
   `data-lenis-prevent`. If the console ever feels wrong under it, the provider
   can be moved into the `(site)` group.
