import type { z } from "zod";
import type { Role } from "@/lib/auth/permissions";
import type { Emirate } from "@/lib/emirates";
import type { UserGroup, userSchema } from "@/validators/user.validator";

export interface UserAddress {
  id: string;
  emirate: Emirate;
  street: string;
  landmark: string;
  isPrimary: boolean;
}

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  /** ISO string — shown as "Last edited". */
  updatedAt: string;
}

export interface UserDetail extends UserListItem {
  /** Whether the account can sign in. */
  hasPassword: boolean;
  addresses: UserAddress[];
}

/** A `type`, not `z.input` of the query schema — `z.coerce` inputs are `unknown`. */
export type UserFilters = {
  group: UserGroup;
  page?: number;
  pageSize?: number;
  search?: string;
};

export type UserInput = z.input<typeof userSchema>;
