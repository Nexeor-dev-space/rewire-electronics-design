import { z } from "zod";
import { FULL_NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/constants";
import {
  authTokenValidator,
  emailValidator,
  newPasswordValidator,
  optionalPhoneValidator,
} from "./common/primitives.validator";

export const signInSchema = z.object({
  email: emailValidator,
  // Length only — the rules for a *new* password don't apply to checking one.
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX_LENGTH, "That password is too long."),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name.").max(FULL_NAME_MAX_LENGTH, "That name is too long."),
  email: emailValidator,
  password: newPasswordValidator,
  phone: optionalPhoneValidator,
});

export const verifyEmailSchema = z.object({
  token: authTokenValidator,
});

export const forgotPasswordSchema = z.object({
  email: emailValidator,
});

export const resetPasswordSchema = z.object({
  token: authTokenValidator,
  password: newPasswordValidator,
});
