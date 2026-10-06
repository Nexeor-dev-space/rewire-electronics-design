import type { z } from "zod";
import type { PermissionGrid, Role } from "@/lib/auth/permissions";
import type {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  verifyEmailSchema,
} from "@/validators/auth.validator";

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
  /** What this user may do in the console: everything for Admin, nothing for Customer. */
  permissions: PermissionGrid;
}

export interface Me extends Omit<SessionUser, "createdAt"> {
  createdAt: string;
}

export interface SignInResult {
  /** `/admin` for Admin and Staff, `/account` for Customers. */
  redirectTo: string;
}

export type SignInInput = z.input<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type VerifyEmailInput = z.input<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
