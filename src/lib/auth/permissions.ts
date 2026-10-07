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
  /** Users → Customers. */
  customers: adminPermission("service", "customers"),
  /** Users → Staff: creating staff and assigning roles, so Admin only. */
  staffAccounts: adminPermission("service", "staff"),
  categories: adminPermission("catalogue", "categories"),
  brands: adminPermission("catalogue", "brands"),
  products: adminPermission("catalogue", "products"),
  inventory: adminPermission("catalogue", "inventory"),
  addOns: adminPermission("catalogue", "add-ons"),
  integrations: adminPermission("governance", "integrations"),
  coupons: adminPermission("marketing", "coupons"),
  orders: adminPermission("sales", "orders"),
  fulfilment: adminPermission("sales", "fulfilment"),
  returns: adminPermission("service", "returns"),
  deliveryZones: adminPermission("governance", "delivery"),
  roles: adminPermission("governance", "roles"),
  changeLog: adminPermission("governance", "change-log"),
  /** Restore (RESTORE) and delete permanently (DELETE) for products and users. */
  trash: adminPermission("governance", "trash"),
} as const;

export interface AdminModule {
  key: string;
  label: string;
  /** The actions this module has; access levels map onto these. */
  actions: readonly PermissionAction[];
  /** Never granted to a Staff role and left off the role form. */
  adminOnly?: boolean;
}

const ALL_ACTIONS: readonly PermissionAction[] = ["VIEW", "CREATE", "EDIT", "DELETE", "PUBLISH"];
const CRUD: readonly PermissionAction[] = ["VIEW", "CREATE", "EDIT", "DELETE"];
const VIEW_EDIT: readonly PermissionAction[] = ["VIEW", "EDIT"];

/** Every module a permission can be granted on, in role form order. */
export const ADMIN_MODULES: readonly AdminModule[] = [
  { key: PERMISSIONS.products, label: "Products", actions: ALL_ACTIONS },
  { key: PERMISSIONS.categories, label: "Categories", actions: ALL_ACTIONS },
  { key: PERMISSIONS.brands, label: "Brands", actions: CRUD },
  { key: PERMISSIONS.inventory, label: "Inventory", actions: VIEW_EDIT },
  { key: PERMISSIONS.addOns, label: "Add-ons", actions: CRUD },
  { key: PERMISSIONS.homepage, label: "Homepage Builder", actions: ALL_ACTIONS },
  { key: PERMISSIONS.content, label: "Content & Policies", actions: ["VIEW", "EDIT", "PUBLISH"] },
  { key: PERMISSIONS.orders, label: "Orders", actions: VIEW_EDIT },
  { key: PERMISSIONS.fulfilment, label: "Fulfilment", actions: VIEW_EDIT },
  { key: PERMISSIONS.returns, label: "Returns", actions: VIEW_EDIT },
  { key: PERMISSIONS.customers, label: "Customers", actions: CRUD },
  { key: PERMISSIONS.coupons, label: "Discount Codes", actions: CRUD },
  { key: PERMISSIONS.deliveryZones, label: "Delivery Zones", actions: VIEW_EDIT },
  { key: PERMISSIONS.changeLog, label: "Change Log", actions: ["VIEW"] },
  { key: PERMISSIONS.trash, label: "Trash", actions: ["VIEW", "RESTORE", "DELETE"] },
  { key: PERMISSIONS.staffAccounts, label: "Staff accounts", actions: CRUD, adminOnly: true },
  { key: PERMISSIONS.integrations, label: "API Credentials", actions: VIEW_EDIT, adminOnly: true },
  { key: PERMISSIONS.roles, label: "Roles", actions: VIEW_EDIT, adminOnly: true },
];

/** The modules a Staff role can be given access to: the rows of the role form. */
export const STAFF_MODULES = ADMIN_MODULES.filter((module) => !module.adminOnly);

/** Module key → granted actions. A module missing from it is not granted. */
export type PermissionGrid = Record<string, PermissionAction[]>;

/** Every action on every module: the Admin's grid. */
export function fullGrid(): PermissionGrid {
  return Object.fromEntries(ADMIN_MODULES.map((module) => [module.key, [...module.actions]]));
}

/* ---------- access levels (Staff roles) ---------- */

/** What a Staff role holds on a module. NONE is stored as no row. */
export const ACCESS_LEVELS = ["NONE", "VIEW", "EDIT", "FULL"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type StoredAccessLevel = Exclude<AccessLevel, "NONE">;

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  NONE: "No access",
  VIEW: "View",
  EDIT: "Edit",
  FULL: "Full access",
};

const LEVEL_ACTIONS: Record<AccessLevel, readonly PermissionAction[] | "ALL"> = {
  NONE: [],
  VIEW: ["VIEW"],
  /** Add and change; deleting, publishing and restoring need Full access. */
  EDIT: ["VIEW", "CREATE", "EDIT"],
  FULL: "ALL",
};

export function levelActions(module: AdminModule, level: AccessLevel): PermissionAction[] {
  const wanted = LEVEL_ACTIONS[level];
  return wanted === "ALL" ? [...module.actions] : module.actions.filter((action) => wanted.includes(action));
}

/**
 * The levels worth offering on a module: each one must grant more than the
 * one before, so Inventory offers no Full and Change Log only View.
 */
export function availableLevels(module: AdminModule): AccessLevel[] {
  const levels: AccessLevel[] = ["NONE"];
  for (const level of ACCESS_LEVELS.slice(1)) {
    const previous = levels[levels.length - 1] as AccessLevel;
    if (levelActions(module, level).length > levelActions(module, previous).length) levels.push(level);
  }
  return levels;
}

/** A Staff role's stored levels turned into the grid every check reads. */
export function gridFromLevels(levels: readonly { module: string; level: StoredAccessLevel }[]): PermissionGrid {
  const grid: PermissionGrid = {};
  for (const { module: key, level } of levels) {
    const found = STAFF_MODULES.find((entry) => entry.key === key);
    if (found) grid[key] = levelActions(found, level);
  }
  return grid;
}

/* ---------- checks ---------- */

/** Admin and Staff reach the console; which modules Staff sees is its role's call. */
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
 * they hold nothing. A row with children (Users) shows the children the user
 * may see, and goes when none are left. A section left with no rows is dropped.
 */
export function visibleAdminNav(permissions: PermissionGrid): AdminNavSection[] {
  const visible = (area: AdminNavSection["area"], key: string) => {
    const moduleKey = adminPermission(area, key);
    return !MODULE_KEYS.has(moduleKey) || hasPermission(permissions, moduleKey);
  };

  return adminNav
    .map((section) => ({
      ...section,
      items: section.items.flatMap((item) => {
        if (!visible(section.area, item.key)) return [];
        if (!item.children) return [item];
        const children = item.children.filter((child) => visible(section.area, child.key));
        const moduleChildren = item.children.some((child) => MODULE_KEYS.has(adminPermission(section.area, child.key)));
        if (moduleChildren && children.length === 0) return [];
        return [{ ...item, children }];
      }),
    }))
    .filter((section) => section.items.length > 0);
}

/* ---------- managing accounts ---------- */

export interface Actor {
  id: string;
  role: Role;
}

/**
 * The module an account action is checked against: Customers when every role
 * involved is Customer, otherwise Staff accounts (Admin only). Moving an
 * account to or from Customer counts as a staff change, so nobody without
 * Staff accounts can hand out console access.
 */
export function accountModule(...roles: Role[]): string {
  return roles.every((role) => role === "CUSTOMER") ? PERMISSIONS.customers : PERMISSIONS.staffAccounts;
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
