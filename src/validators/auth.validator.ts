import { z } from "zod";
import { emailValidator } from "./common/primitives.validator";

export const signInSchema = z.object({
  email: emailValidator,
  // Length only — the rules for a *new* password don't apply to checking one.
  password: z.string().min(1, "Enter your password.").max(128, "That password is too long."),
});
