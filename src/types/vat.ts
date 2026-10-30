import type { z } from "zod";
import type { vatSettingsSchema } from "@/validators/vat.validator";

export type VatSettingsInput = z.input<typeof vatSettingsSchema>;
