import { adminNav, adminPermission, type AdminNavSection } from "@/lib/admin-nav";

/**
 * Roles and what each may do. Client-safe, so the UI can hide what the
 * server would refuse — the server check is the one that counts.
 */

export const ROLES = ["ADMIN", "STAFF", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  STAFF: "Staff",
  CUSTOMER: "Customer",
};

/* ---------- modules and actions ---------- */

export const PERMISSION_ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH", "RESTORE"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  VIEW: "View",
  CREATE: "Create",
  EDIT: "Edit",
  DELETE: "Delete",
  PUBLISH: "Publish",
  RESTORE: "Restore",
};

/** Module keys: `adminPermission(area, key)`, the same key the nav row carries. */
export const PERMISSIONS = {
  content: adminPermission("storefront", "content"),
  homepage: adminPermission("storefront", "homepage"),
  /** Covers both Users screens — staff accounts and customer accounts. */
  users: adminPermission("service", "users"),
  categories: adminPermission("catalogue", "categories"),
  brands: adminPermission("catalogue", "brands"),
  products: adminPermission("catalogue", "products"),
  inventory: adminPermission("catalogue", "inventory"),
  addOns: adminPermission("catalogue", "add-ons"),
  integrations: adminPermission("governance", "integrations"),
  coupons: adminPermission("marketing", "coupons"),
  deliveryZones: adminPermission("governance", "delivery"),
  roles: adminPermission("governance", "roles"),
  changeLog: adminPermission("governance", "change-log"),
  /** Restore (RESTORE) and delete permanently (DELETE) for products and users. */
  trash: adminPermission("governance", "trash"),
} as const;

export interface AdminModule {
  key: string;
  label: string;
  /** The actions this module has. The Roles grid offers only these. */
  actions: readonly PermissionAction[];
  /** Never granted to Staff and left off the Roles grid. */
  adminOnly?: boolean;
}

const ALL_ACTIONS: readonly PermissionAction[] = ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"];
const CRUD: readonly PermissionAction[] = ["VIEW", "CREATE", "EDIT", "DELETE"];
const VIEW_EDIT: readonly PermissionAction[] = ["VIEW", "EDIT"];

/** Every module a permission can be granted on, in Roles grid order. */
export const ADMIN_MODULES: readonly AdminModule[] = [
  { key: PERMISSIONS.products, label: "Products", actions: ALL_ACTIONS },
  { key: PERMISSIONS.categories, label: "Categories", actions: ALL_ACTIONS },
  { key: PERMISSIONS.brands, label: "Brands", actions: CRUD },
  { key: PERMISSIONS.inventory, label: "Inventory", actions: VIEW_EDIT },
  { key: PERMISSIONS.addOns, label: "Add-ons", actions: CRUD },
  { key: PERMISSIONS.homepage, label: "Homepage Builder", actions: ALL_ACTIONS },
  { key: PERMISSIONS.content, label: "Content & Policies", actions: ["VIEW", "EDIT", "PUBLISH"] },
  { key: PERMISSIONS.users, label: "Users", actions: CRUD },
  { key: PERMISSIONS.coupons, label: "Discount Codes", actions: CRUD },
  { key: PERMISSIONS.deliveryZones, label: "Delivery Zones", actions: VIEW_EDIT },
  { key: PERMISSIONS.changeLog, label: "Change Log", actions: ["VIEW"] },
  { key: PERMISSIONS.trash, label: "Trash", actions: ["VIEW", "RESTORE", "DELETE"] },
  { key: PERMISSIONS.integrations, label: "API Credentials", actions: VIEW_EDIT, adminOnly: true },
  { key: PERMISSIONS.roles, label: "Roles", actions: VIEW_EDIT, adminOnly: true },
];

/** The modules Staff can be granted, i.e. the rows of the Roles grid. */
export const STAFF_MODULES = ADMIN_MODULES.filter((module) => !module.adminOnly);

/** Module key → granted actions. A module missing from it is not granted. */
export type PermissionGrid = Record<string, PermissionAction[]>;

/** Every action on the given modules. */
export function fullGrid(modules: readonly AdminModule[] = ADMIN_MODULES): PermissionGrid {
  return Object.fromEntries(modules.map((module) => [module.key, [...module.actions]]));
}

/**
 * Keeps only actions the module has, in a stable order. Any action implies
 * VIEW: you can't change what you can't see.
 */
export function normaliseActions(module: AdminModule, actions: readonly string[]): PermissionAction[] {
  const kept = module.actions.filter((action) => actions.includes(action));
  if (kept.length > 0 && !kept.includes("VIEW")) kept.unshift("VIEW");
  return kept;
}

/* ---------- checks ---------- */

/** Admin and Staff reach the console; which modules Staff sees is the grid's call. */
export function canAccessAdmin(role: Role): boolean {
  return role !== "CUSTOMER";
}

/** True when the grid lets the user open at least one module. */
export function hasAnyModule(permissions: PermissionGrid): boolean {
  return Object.values(permissions).some((actions) => actions.includes("VIEW"));
}

export function hasPermission(
  permissions: PermissionGrid,
  module: string,
  action: PermissionAction = "VIEW",
): boolean {
  return permissions[module]?.includes(action) ?? false;
}

/** The actions as booleans, for a screen deciding what to show. */
export function moduleAccess(permissions: PermissionGrid, module: string) {
  return {
    view: hasPermission(permissions, module, "VIEW"),
    create: hasPermission(permissions, module, "CREATE"),
    edit: hasPermission(permissions, module, "EDIT"),
    delete: hasPermission(permissions, module, "DELETE"),
    publish: hasPermission(permissions, module, "PUBLISH"),
    restore: hasPermission(permissions, module, "RESTORE"),
  };
}

export type ModuleAccess = ReturnType<typeof moduleAccess>;

const MODULE_KEYS = new Set(ADMIN_MODULES.map((module) => module.key));

/**
 * The navigation the user may see: a row that is a permission module needs
 * VIEW on it; placeholder rows for modules not built yet stay visible, since
 * they hold nothing. A section left with no rows is dropped.
 */
export function visibleAdminNav(permissions: PermissionGrid): AdminNavSection[] {
  return adminNav
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const key = adminPermission(section.area, item.key);
        return !MODULE_KEYS.has(key) || hasPermission(permissions, key);
      }),
    }))
    .filter((section) => section.items.length > 0);
}

/* ---------- managing accounts ---------- */

export interface Actor {
  id: string;
  role: Role;
}

/** Only Admins edit or delete Admin accounts. */
export function canManageUser(viewer: Actor, target: { role: Role }): boolean {
  return viewer.role === "ADMIN" || target.role !== "ADMIN";
}

/** Only Admins give out the Admin role. */
export function assignableRoles(viewer: Role): Role[] {
  return viewer === "ADMIN" ? [...ROLES] : ["STAFF", "CUSTOMER"];
}

/** A password decides who can sign in as an account, so only Admins set one. */
export function canSetPassword(viewer: Role): boolean {
  return viewer === "ADMIN";
}

export function canManageIntegrations(role: Role): boolean {
  return role === "ADMIN";
}
