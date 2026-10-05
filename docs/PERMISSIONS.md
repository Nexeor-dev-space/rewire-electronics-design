# Role Permissions

What each role may do in the admin console, how an Admin configures it, and
how the API and the screens enforce it.

Read this before adding an admin module, an admin API route, or a button that
changes data in the console.

---

## 1. What exists

1. Three fixed roles, the `UserRole` enum: `ADMIN`, `STAFF`, `CUSTOMER`.
   There are no custom roles.
2. Five actions, the `PermissionAction` enum: `VIEW`, `CREATE`, `EDIT`,
   `DELETE`, `PUBLISH`.
3. **Admin** always holds every action on every module. It is fixed in code
   and can't be edited, so nobody can lock the console.
4. **Customer** holds nothing and never reaches the console.
5. **Staff** holds whatever an Admin ticks on the Roles screen
   (Governance → Roles, `/admin/roles`).
6. Which account has which role is set in Users → Staff (Admin or Staff),
   unchanged by this work.

The API is the real gate. The sidebar and the hidden buttons are a courtesy
that keeps people from clicking into a 403.

---

## 2. Files

| File | Purpose |
| --- | --- |
| `prisma/schema/user.prisma` | `PermissionAction` enum, `RolePermission` model |
| `src/lib/auth/permissions.ts` | `PERMISSIONS`, `ADMIN_MODULES`, `STAFF_MODULES`, `hasPermission`, `moduleAccess`, `normaliseActions`, `fullGrid`, `hasAnyModule`, `visibleAdminNav` (client safe) |
| `src/lib/auth/permissions.test.ts` | Tests for the rules above |
| `src/services/role-permission.service.ts` | `getRolePermissions(role)`, `getStaffPermissions()`, `saveStaffPermissions(grid, actorId)` and the in memory cache |
| `src/lib/auth/session.ts` | `getSession()` attaches `user.permissions`; `authorizeApi(module, action)`; `forbidden()` |
| `src/validators/role.validator.ts` | `staffPermissionsSchema` |
| `src/types/role.ts` | `StaffPermissions` |
| `src/app/api/v1/admin/roles/staff/route.ts` | `GET` and `PUT` the Staff grid |
| `src/hooks/use-role.ts` | `useGetStaffPermissions`, `useSaveStaffPermissions` |
| `src/app/admin/roles/page.tsx`, `src/components/admin/roles/role-permissions.tsx` | The Roles screen |
| `src/components/admin/admin-access.tsx` | `AdminAccessProvider`, `useAdminPermissions`, `useModuleAccess` |

---

## 3. Data model

```prisma
enum PermissionAction { VIEW CREATE EDIT DELETE PUBLISH }

model RolePermission {
  role        UserRole
  module      String              // a module key, e.g. "catalogue.products"
  actions     PermissionAction[]
  updatedById String?             // the Admin who last saved, SetNull on delete
  createdAt   DateTime
  updatedAt   DateTime
  @@id([role, module])
  @@map("role_permissions")
}
```

1. Only `STAFF` rows are ever written.
2. `module` is a string, not an enum, so a new module needs no migration.
3. **Never configured.** While the table holds no Staff rows at all, Staff
   keep every action on every Staff module. That is how Staff worked before
   this existed, so the deploy changes nothing and no data migration is
   needed.
4. **After the first save** every Staff module has a row (an empty `actions`
   when nothing is granted). From then on a module with no row, for example
   one added in a later release, grants Staff nothing until an Admin ticks it.

Migration: `add_role_permissions` (run by the developer with
`npm run db:migrate -- --name add_role_permissions`).

---

## 4. Modules

`ADMIN_MODULES` in `permissions.ts` is the list. Each module's key is the same
`adminPermission(area, key)` string its sidebar row carries.

| Module | Key | Actions |
| --- | --- | --- |
| Products | `catalogue.products` | View, Create, Edit, Delete, Publish |
| Categories | `catalogue.categories` | View, Create, Edit, Delete, Publish |
| Brands | `catalogue.brands` | View, Create, Edit, Delete |
| Inventory | `catalogue.inventory` | View, Edit |
| Add-ons | `catalogue.add-ons` | View, Create, Edit, Delete |
| Homepage Builder | `storefront.homepage` | View, Create, Edit, Delete, Publish |
| Content & Policies | `storefront.content` | View, Edit, Publish |
| Users | `service.users` | View, Create, Edit, Delete |
| Discount Codes | `marketing.coupons` | View, Create, Edit, Delete |
| Delivery Zones | `governance.delivery` | View, Edit |
| API Credentials | `governance.integrations` | Admin only |
| Roles | `governance.roles` | Admin only |

Admin only modules are left off the Staff grid and are never granted to Staff.

**View is implied.** Granting any action also grants View, and removing View
removes everything on that module. `normaliseActions` enforces this on save,
so the rule holds even for a hand written API call.

---

## 5. What each action covers

| Action | API | Notes |
| --- | --- | --- |
| View | every `GET` | Also the page itself and the sidebar row |
| Create | `POST` that creates | Homepage: add section |
| Edit | `PUT` / `PATCH` | Homepage: edit, show or hide, reorder. Inventory: stock |
| Delete | `DELETE` | |
| Publish | `PATCH …/status` (products, categories), `POST homepage/publish`, `POST homepage/discard` | See below for status set from a form |

Publish through a form:

1. **Categories.** The category form carries a status. Without Publish, a
   create must be `DRAFT` and an edit must keep the current status; anything
   else answers 403. The form locks the status select and starts new
   categories as Draft.
2. **Policies.** Changing the Published switch in `savePolicy` needs Publish;
   the editor locks the switch without it. Editing text needs Edit.

The image upload (`POST /api/v1/uploads/images`) is open to anyone with
Create or Edit on Products, Categories, Brands or Homepage Builder.

Users keeps its own rules on top of the grid: only Admins touch Admin
accounts or set passwords, nobody deletes themselves, the last Admin stays.

---

## 6. Enforcement

**Session.** `getSession()` loads the user, then attaches
`permissions = getRolePermissions(role)`: `fullGrid()` for Admin, the cached
Staff grid for Staff, `{}` for Customer.

**API.** Every admin route starts with

```ts
const auth = await authorizeApi(PERMISSIONS.coupons, "DELETE");
if (!auth.ok) return auth.response;
```

`action` defaults to `"VIEW"`, so `GET` handlers pass only the module. The
answers are 401 `UNAUTHENTICATED` when signed out and 403 `FORBIDDEN` "Your
account doesn't have access to this." without the action. `forbidden()`
returns the same 403 for checks made after the input is parsed.

**Pages.** Each module page checks View with
`hasPermission(session.user.permissions, PERMISSIONS.<module>)` and shows
"Access denied" otherwise. The admin layout shows the access denied screen to
a Customer and to Staff whose grid opens no module.

**Server Actions** check for themselves (`savePolicy`).

**Cache.** The Staff grid is read on every admin request, so it lives in
process memory (`globalThis`) and is dropped when the grid is saved. The
first request after a restart or a save runs one query.

---

## 7. Screens

**Sidebar.** `visibleAdminNav(permissions)` hides a row that is a module the
user can't view, and a section left empty. Rows for modules not built yet
(Orders, Releases and so on) stay visible, because they hold nothing.

**Buttons.** `AdminShell` puts the session's grid in `AdminAccessProvider`.
A screen calls `useModuleAccess(PERMISSIONS.<module>)` and gets
`{ view, create, edit, delete, publish }`:

| Screen | Without the action |
| --- | --- |
| Products, Categories, Brands, Add-ons, Discount Codes | Add button, row Edit and row Delete are hidden; the status select is locked without Publish |
| Users | Add, Edit and Delete hidden (on top of the existing account rules) |
| Inventory | The stock field is locked and Save hidden without Edit |
| Delivery Zones | Edit hidden |
| Homepage Builder | Add section row hidden without Create; edit, move and show or hide locked without Edit; Delete hidden; Publish and Discard draft hidden |
| Content & Policies | Edit links hidden and the editor page refused without Edit; Published switch locked without Publish |

`RowActions` renders only the actions it is given: pass `undefined` for
`onEdit` or `onDelete` to hide that button.

A 403 that still happens (for example a grid changed while the screen was
open) shows the API message in the screen's usual error spot.

---

## 8. Roles screen and API

Governance → **Roles**, `/admin/roles`, Admin only.

1. The Admin and Customer roles are shown as fixed.
2. The Staff grid has one row per Staff module and one column per action. A
   cell the module doesn't support shows a dash. Ticking any action ticks
   View; unticking View clears the row.
3. **Save permissions** sends the whole grid; **Reset** returns to the saved
   one.

| Route | Permission | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /api/v1/admin/roles/staff` | `governance.roles` View | | 200 `{ permissions }` | 401, 403 |
| `PUT /api/v1/admin/roles/staff` | `governance.roles` Edit | `{ permissions: { "<module>": ["VIEW", …] } }` | 200 `{ permissions }`, the grid as stored | 401, 403, 422 |

`PUT` replaces the whole grid in one transaction. A module left out of the
body grants nothing; an unknown module key or action is 422. Actions are
normalised (unsupported dropped, View added) before they are stored.

Path: `API_ENDPOINTS.admin.roles.staff`. Hooks: `useGetStaffPermissions`,
`useSaveStaffPermissions` (invalidates `["roles"]`).

---

## 9. Adding a module

1. Add its key to `PERMISSIONS` and an entry to `ADMIN_MODULES` with the
   actions it supports (`adminOnly: true` if Staff must never have it).
2. Start every route with `authorizeApi(PERMISSIONS.<module>, "<ACTION>")`
   following section 5.
3. Check View on the page; use `useModuleAccess` to hide buttons.
4. Staff get it with no actions until an Admin ticks it (or all of them, if
   the grid was never saved).

---

## 10. Known limits

1. **Single instance only.** The cache is per process, like the rate limits
   ([AUTH.md](AUTH.md) §11). A second instance would serve a stale grid
   until restarted.
2. **Open screens keep their buttons.** The sidebar and buttons come from the
   session at page load. After an Admin narrows Staff, a Staff member's open
   screen still shows the old buttons until a reload, but the API refuses the
   action at once.
3. **Fixed roles.** Every Staff account shares one grid. Per person access
   would need custom roles (a `Role` table and `User.roleId`).
4. **No audit trail yet.** `updatedById` and `updatedAt` record the last save
   only; the Change Log module is separate work.
