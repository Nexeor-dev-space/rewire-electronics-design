import type { z } from "zod";
import type { Role } from "@/lib/auth/permissions";
import type { signInSchema } from "@/validators/auth.validator";

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface SignInResult {
  /** `/admin` for Admin and Staff, `/account` for Customers. */
  redirectTo: string;
}

export type SignInInput = z.input<typeof signInSchema>;
