import type { z } from "zod";
import type { Role } from "@/lib/auth/permissions";
import type { Emirate } from "@/lib/emirates";
import type { customerSchema } from "@/validators/customer.validator";

export interface CustomerAddress {
  id: string;
  emirate: Emirate;
  street: string;
  landmark: string;
  isPrimary: boolean;
}

export interface CustomerListItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  /** ISO string — shown as "Last edited". */
  updatedAt: string;
}

export interface CustomerDetail extends CustomerListItem {
  /** Whether the account can sign in. */
  hasPassword: boolean;
  addresses: CustomerAddress[];
}

/** A `type`, not `z.input` of the query schema — `z.coerce` inputs are `unknown`. */
export type CustomerFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type CustomerInput = z.input<typeof customerSchema>;
