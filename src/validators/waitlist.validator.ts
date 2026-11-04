import { z } from "zod";
import { RELEASES_PAGE_SIZE, WAITLIST_ADMIN_PAGE_SIZE, WAITLIST_PAGE_SIZE } from "@/lib/constants";
import {
  authTokenValidator,
  emailValidator,
  idValidator,
  optionalPhoneValidator,
} from "./common/primitives.validator";

const MESSAGE_PHONE_REQUIRED = "Enter a phone number for WhatsApp updates.";

function requirePhoneForWhatsapp(value: { whatsappOptIn: boolean; phone: string | null }, ctx: z.RefinementCtx) {
  if (value.whatsappOptIn && !value.phone) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: MESSAGE_PHONE_REQUIRED });
  }
}

function pageQuery(size: number) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(size).default(size),
  });
}

export const joinWaitlistSchema = z
  .object({
    email: emailValidator,
    emailOptIn: z.boolean().default(true),
    whatsappOptIn: z.boolean().default(false),
    phone: optionalPhoneValidator,
  })
  .superRefine(requirePhoneForWhatsapp);

export const updateWaitlistSchema = z
  .object({
    emailOptIn: z.boolean(),
    whatsappOptIn: z.boolean(),
    phone: optionalPhoneValidator,
  })
  .superRefine(requirePhoneForWhatsapp);

export const waitlistTokenSchema = z.object({ token: authTokenValidator });

export const waitlistEntryParamsSchema = z.object({ id: idValidator });

export const myWaitlistsQuerySchema = pageQuery(WAITLIST_PAGE_SIZE);

export const adminWaitlistQuerySchema = pageQuery(WAITLIST_ADMIN_PAGE_SIZE);

export const storefrontReleasesQuerySchema = pageQuery(RELEASES_PAGE_SIZE);
