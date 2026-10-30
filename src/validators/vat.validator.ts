import { z } from "zod";
import { VAT_RATE_MAX_PERCENT } from "@/lib/constants";

export const vatSettingsSchema = z.object({
  vatRatePercent: z
    .number("Enter a VAT rate.")
    .int("Use a whole percentage.")
    .min(0, "Use 0% or more.")
    .max(VAT_RATE_MAX_PERCENT, `Use ${VAT_RATE_MAX_PERCENT}% or less.`),
});
