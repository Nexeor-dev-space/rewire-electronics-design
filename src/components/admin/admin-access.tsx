"use client";

import { createContext, useContext, type ReactNode } from "react";
import { moduleAccess, type ModuleAccess, type PermissionGrid } from "@/lib/auth/permissions";

/**
 * The signed-in user's permission grid, handed down from the admin layout's
 * session so any console screen can hide what it may not do. Hiding is a
 * courtesy: every API route checks the same grid and answers 403.
 */

const AdminAccessContext = createContext<PermissionGrid>({});

export function AdminAccessProvider({
  permissions,
  children,
}: {
  permissions: PermissionGrid;
  children: ReactNode;
}) {
  return <AdminAccessContext.Provider value={permissions}>{children}</AdminAccessContext.Provider>;
}

export function useAdminPermissions(): PermissionGrid {
  return useContext(AdminAccessContext);
}

/** `{ view, create, edit, delete, publish }` for one module. */
export function useModuleAccess(module: string): ModuleAccess {
  return moduleAccess(useAdminPermissions(), module);
}
