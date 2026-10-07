# Role Permissions

What each role may do in the admin console, how an Admin creates and assigns
Staff roles, and how the API and the screens enforce it.

Read this before adding an admin module, an admin API route, or a button that
changes data in the console.

---

## 1. What exists

1. Every account has a kind, the `UserRole` enum: `ADMIN`, `STAFF`,
   `CUSTOMER`.
2. **Admin** always holds every action on every module. It is fixed in code
   and can't be restricted or deleted, so nobody can lock the console.
3. **Customer** holds nothing and never reaches the console.
4. **Staff** accounts work under a **custom Staff role** an Admin creates on
   Governance → Roles: a name, an optional description, and an access level
   per module (No access, View, Edit, Full access).
5. An Admin assigns the role in Users → Staff. A Staff account with no role
   has no access and sees the access denied screen.
6. Behind the levels the API checks six actions: `VIEW`, `CREATE`, `EDIT`,
   `DELETE`, `PUBLISH`, `RESTORE`.

The API is the real gate. The sidebar and the hidden buttons are a courtesy
that keeps people from clicking into a 403.

**Changed from the fixed Staff grid.** The single grid every Staff account
shared (`role_permissions`) is gone. Staff accounts that existed before kept
no access until an Admin gave them a role; no data was carried over.

---

## 2. Files

| File | Purpose |
| --- | --- |
| `prisma/schema/user.prisma` | `AccessLevel` enum, `StaffRole`, `StaffRolePermission`, `User.staffRoleId` |
| `src/lib/auth/permissions.ts` | `PERMISSIONS`, `ADMIN_MODULES`, `STAFF_MODULES`, `ACCESS_LEVELS`, `levelActions`, `availableLevels`, `gridFromLevels`, `fullGrid`, `hasPermission`, `moduleAccess`, `accountModule`, `hasAnyModule`, `visibleAdminNav` (client safe) |
| `src/lib/auth/session.ts` | `getSession()` builds `user.permissions` from the role; `authorizeApi(module, action)`; `forbidden()` |
| `src/services/staff-role.service.ts` | `listStaffRoles`, `getStaffRole`, `createStaffRole`, `updateStaffRole`, `deleteStaffRole`, `assertStaffRoleExists` |
| `src/validators/role.validator.ts` | `staffRoleSchema`, `staffRoleListQuerySchema` |
| `src/types/role.ts` | `StaffRoleListItem`, `StaffRoleDetail`, `StaffRoleFilters`, `StaffRoleInput` |
| `src/app/api/v1/admin/roles/` | The roles API (section 8) |
| `src/hooks/use-role.ts` | `useGetStaffRoles`, `useGetStaffRole`, `useCreateStaffRole`, `useUpdateStaffRole`, `useDeleteStaffRole` |
| `src/app/admin/roles/page.tsx`, `src/components/admin/roles/` | The Roles list and the Add / Edit role modal |
| `src/components/admin/users/user-form-modal.tsx` | The Staff role picker on a Staff account |
| `src/components/admin/admin-access.tsx` | `AdminAccessProvider`, `useAdminPermissions`, `useModuleAccess` |

---

## 3. Data model

```prisma
enum AccessLevel { VIEW EDIT FULL }          // No access = no row

model StaffRole {
  id          String   @id @default(cuid())
  name        String
  nameKey     String   @unique              // trimmed, lowercased: names unique ignoring case
  description String?
  users       User[]                        // accounts holding it
  permissions StaffRolePermission[]
  updatedById String?                       // last Admin to save, SetNull
  createdAt   DateTime
  updatedAt   DateTime
  @@map("staff_roles")
}

model StaffRolePermission {
  roleId String                             // Cascade with the role
  module String                             // a module key, e.g. "catalogue.products"
  level  AccessLevel
  @@id([roleId, module])
  @@map("staff_role_permissions")
}

User.staffRoleId String?                    // StaffRole, onDelete Restrict
```

1. `module` is a string, so a new module needs no migration. A role has no
   row for it until an Admin sets a level, so new modules start as No access.
2. Only `STAFF` accounts keep a `staffRoleId`; saving any other kind stores
   null.
3. A role can't be deleted while any account holds it, deleted accounts in
   Trash included (the foreign key is `Restrict`, and the service answers 409
   first with the count).

Migration: one, creating the two tables and `users.staffRoleId` and dropping
`role_permissions` with the `PermissionAction` enum (run by the developer with
`npm run db:migrate -- --name add_staff_roles`).

---

## 4. Levels and modules

A level stands for a set of actions (`levelActions`):

| Level | Actions |
| --- | --- |
| No access | none |
| View | View |
| Edit | View, Create, Edit: add and change |
| Full access | every action the module has, so also Delete, Publish and Restore |

`ADMIN_MODULES` in `permissions.ts` lists the modules. Each key is the same
`adminPermission(area, key)` string its sidebar row carries. A module offers
only the levels that grant more than the one below (`availableLevels`):

| Module | Key | Actions | Levels offered |
| --- | --- | --- | --- |
| Products | `catalogue.products` | View, Create, Edit, Delete, Publish | all |
| Categories | `catalogue.categories` | View, Create, Edit, Delete, Publish | all |
| Brands | `catalogue.brands` | View, Create, Edit, Delete | all |
| Inventory | `catalogue.inventory` | View, Edit | No access, View, Edit |
| Add-ons | `catalogue.add-ons` | View, Create, Edit, Delete | all |
| Homepage Builder | `storefront.homepage` | View, Create, Edit, Delete, Publish | all |
| Content & Policies | `storefront.content` | View, Edit, Publish | all |
| Customers | `service.customers` | View, Create, Edit, Delete | all |
| Returns | `service.returns` | View, Edit | No access, View, Edit |
| Discount Codes | `marketing.coupons` | View, Create, Edit, Delete | all |
| Orders | `sales.orders` | View, Edit | No access, View, Edit |
| Fulfilment | `sales.fulfilment` | View, Edit | No access, View, Edit |
| Delivery Zones | `governance.delivery` | View, Edit | No access, View, Edit |
| Change Log | `governance.change-log` | View | No access, View |
| Trash | `governance.trash` | View, Restore, Delete | No access, View, Full access |
| Staff accounts | `service.staff` | Admin only | |
| API Credentials | `governance.integrations` | Admin only | |
| Roles | `governance.roles` | Admin only | |

Orders and Fulfilment (`PERMISSIONS.orders`, `PERMISSIONS.fulfilment`) were
added in Phase 5. Staff roles that existed before have no row for them, so
they hold No access until an Admin sets a level on the Roles screen. Edit on
Fulfilment changes tracking and status only; payment status and the staff note
need Edit on Orders. See [ORDERS.md](ORDERS.md) §13.

Returns (`PERMISSIONS.returns`) was added in Phase 7 and follows the same
rule: existing Staff roles hold No access until an Admin sets a level. View
covers the Returns list and detail and reading the return window; Edit covers
status changes, recording a refund and changing the return window (the
`admin/store-settings` routes use this key while the window is the only
setting). See [RETURNS.md](RETURNS.md) §12.

Admin only modules are never on a Staff role. The validator refuses a level a
module doesn't offer, and an unknown module key.

---

## 5. What each action covers

| Action | API | Notes |
| --- | --- | --- |
| View | every `GET` | Also the page itself and the sidebar row |
| Create | `POST` that creates | Homepage: add section |
| Edit | `PUT` / `PATCH` | Homepage: edit, show or hide, reorder. Inventory: stock |
| Delete | `DELETE` | |
| Publish | `PATCH …/status` (products, categories), `POST homepage/publish`, `POST homepage/discard` | See below for status set from a form |
| Restore | `POST trash/…/restore` | Trash only; see [TRASH-AUDIT.md](TRASH-AUDIT.md) |

Publish through a form:

1. **Categories.** The category form carries a status. Without Publish, a
   create must be `DRAFT` and an edit must keep the current status; anything
   else answers 403. The form locks the status select and starts new
   categories as Draft.
2. **Policies.** Changing the Published switch in `savePolicy` needs Publish;
   a missing policy counts as unpublished. The editor locks the switch
   without it. Editing text needs Edit.

The image upload (`POST /api/v1/uploads/images`) is open to anyone with
Create or Edit on Products, Categories, Brands or Homepage Builder.

**Accounts.** `accountModule(...roles)` picks the module for an account
action: Customers when every role involved is Customer, otherwise Staff
accounts. The Users routes pass both the account's current and new role, so
turning a customer into staff (or back) needs Staff accounts, which only
Admins hold. Restoring a deleted Staff account from Trash needs it too. On
top of that the old rules stay: only Admins touch Admin accounts or set
passwords, nobody changes their own role or deletes themselves, the last
Admin stays.

---

## 6. Enforcement

**Session.** `getSession()` reads the user and, in the same query, its Staff
role's levels (about a dozen small rows). `permissions` is `fullGrid()` for
Admin, `gridFromLevels(levels)` for Staff (empty without a role), `{}` for
Customer. There is no cache: a role edit or a new assignment applies on the
next request.

**API.** Every admin route starts with

```ts
const auth = await authorizeApi(PERMISSIONS.coupons, "DELETE");
if (!auth.ok) return auth.response;
```

`action` defaults to `"VIEW"`, so `GET` handlers pass only the module. The
answers are 401 `UNAUTHENTICATED` when signed out and 403 `FORBIDDEN` "Your
account doesn't have access to this." without the action. `forbidden()`
returns the same 403 for checks made after the input is parsed (the Users
routes, which need the account's role first).

**Pages.** Each module page checks View with
`hasPermission(session.user.permissions, PERMISSIONS.<module>)` and shows
"Access denied" otherwise. The admin layout shows the access denied screen to
a Customer and to Staff whose role opens no module (or who have no role).

**Server Actions** check for themselves (`savePolicy`).

---

## 7. Screens

**Sidebar.** `visibleAdminNav(permissions)` hides a row that is a module the
user can't view, and a section left empty. A row with children (Users) keeps
only the children the user may see, and goes when none are left. Rows for
modules not built yet (Releases and so on) stay visible, because they
hold nothing.

**Buttons.** `AdminShell` puts the session's grid in `AdminAccessProvider`.
A screen calls `useModuleAccess(PERMISSIONS.<module>)` and gets
`{ view, create, edit, delete, publish, restore }`:

| Screen | Without the action |
| --- | --- |
| Products, Categories, Brands, Add-ons, Discount Codes | Add button, row Edit and row Delete are hidden; the status select is locked without Publish |
| Users → Customers | Add, Edit and Delete hidden |
| Users → Staff | Admin only; the page answers Access denied to Staff |
| Inventory | The stock field is locked and Save hidden without Edit |
| Delivery Zones | Edit hidden |
| Returns | Status buttons, the Record refund button and the Return window button are hidden (the window shows as plain text) without Edit; the list and detail need View, and the sidebar row needs View |
| Orders detail | Status, payment, tracking and staff note controls hidden without Edit; the list and detail need View |
| Fulfilment | Tracking field, Save and Move to buttons replaced by read only text without Edit; the order number links to the detail only with Orders View |
| Homepage Builder | Add section row hidden without Create; edit, move and show or hide locked without Edit; Delete hidden; Publish and Discard draft hidden |
| Content & Policies | Edit links hidden and the editor page refused without Edit; Published switch locked without Publish |
| Trash | Restore and Delete permanently hidden; Restore on a Staff account needs Staff accounts |

`RowActions` renders only the actions it is given: pass `undefined` for
`onEdit` or `onDelete` to hide that button.

A 403 that still happens (for example a role changed while the screen was
open) shows the API message in the screen's usual error spot.

---

## 8. Roles screen and API

Governance → **Roles**, `/admin/roles`, Admin only.

1. **The list** shows Admin and Customer as fixed rows, then the custom roles
   with their description and how many accounts hold each, with Edit and
   Delete. **Add role** opens the modal.
2. **The modal** takes a name (unique, ignoring case), an optional
   description, and a level per module from a select that offers only that
   module's levels.
3. **Delete** asks for confirmation; a role still held is refused and the
   dialog says how many accounts hold it.
4. **Assigning** happens in Users → Staff: a Staff account's modal has a
   Staff role select ("No role (no access)" until one is picked). The
   validator requires a role when the account kind is Staff. The Staff list
   shows the role name in place of "Staff".

All routes need `governance.roles` (Admin only) and are recorded in the
change log under Roles.

| Route | Body | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/v1/admin/roles?page&pageSize&search` | | 200 `Paginated<StaffRoleListItem>`, by name | 401, 403, 422 |
| `POST /api/v1/admin/roles` | `{ name, description?, permissions: { "<module>": "NONE" \| "VIEW" \| "EDIT" \| "FULL" } }` | 201 `StaffRoleDetail` | 401, 403, 409 `fields.name`, 422 |
| `GET /api/v1/admin/roles/[id]` | | 200 `StaffRoleDetail` (every Staff module, `NONE` included) | 401, 403, 404 |
| `PUT /api/v1/admin/roles/[id]` | as `POST` | 200 `StaffRoleDetail` | 401, 403, 404, 409, 422 |
| `DELETE /api/v1/admin/roles/[id]` | | 200 `{ id }` | 401, 403, 404, 409 while held |

A module left out of `permissions` is No access. Paths are in
`API_ENDPOINTS.admin.roles`; mutations invalidate `["roles"]`.

Limits: `STAFF_ROLE_NAME_MAX_LENGTH` (60) and
`STAFF_ROLE_DESCRIPTION_MAX_LENGTH` (200) in `src/lib/constants.ts`.

---

## 9. Adding a module

1. Add its key to `PERMISSIONS` and an entry to `ADMIN_MODULES` with the
   actions it supports (`adminOnly: true` if Staff must never have it). The
   levels it offers follow from those actions.
2. Start every route with `authorizeApi(PERMISSIONS.<module>, "<ACTION>")`
   following section 5.
3. Check View on the page; use `useModuleAccess` to hide buttons.
4. Existing roles hold No access on it until an Admin edits them.

---

## 10. Known limits

1. **Open screens keep their buttons.** The sidebar and buttons come from the
   session at page load. After an Admin narrows a role, an open screen still
   shows the old buttons until a reload, but the API refuses the action at
   once.
2. **One role per account.** A Staff account holds exactly one role; there is
   no combining of roles.
3. **Level granularity.** Edit always includes Create; a role can't change
   records without also adding them.
