import type { z } from "zod";
import type { ReleaseStatus } from "@/lib/releases";
import type { ProductCondition, ProductGrade } from "@/validators/product.validator";
import type { joinWaitlistSchema, updateWaitlistSchema, waitlistTokenSchema } from "@/validators/waitlist.validator";

export interface StorefrontReleaseImage {
  url: string;
  alt: string;
}

export interface StorefrontReleaseSummary {
  id: string;
  slug: string;
  title: string;
  edition: string;
  status: ReleaseStatus;
  startsAt: string;
  endsAt: string | null;
  maxPerCustomer: number;
  totalAvailable: number;
  productNames: string[];
  image: StorefrontReleaseImage | null;
  fromPrice: number | null;
  compareAtPrice: number | null;
}

export interface StorefrontReleaseVariant {
  id: string;
  sku: string;
  storage: string | null;
  colour: string | null;
  condition: ProductCondition;
  grade: ProductGrade | null;
  price: number;
  compareAtPrice: number | null;
  available: number;
}

export interface StorefrontReleaseProduct {
  id: string;
  name: string;
  slug: string;
  images: StorefrontReleaseImage[];
  variants: StorefrontReleaseVariant[];
}

export interface StorefrontRelease extends StorefrontReleaseSummary {
  description: string;
  products: StorefrontReleaseProduct[];
}

export type WaitlistJoinStatus = "CONFIRMED" | "CHECK_INBOX";

export interface WaitlistJoinResult {
  status: WaitlistJoinStatus;
}

export interface WaitlistConfirmResult {
  releaseSlug: string | null;
  releaseTitle: string;
}

export interface MyWaitlistEntry {
  id: string;
  releaseSlug: string | null;
  releaseTitle: string;
  startsAt: string;
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  phone: string | null;
  confirmed: boolean;
  joinedAt: string;
}

export interface AdminWaitlistEntry {
  id: string;
  email: string;
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  phone: string | null;
  confirmedAt: string | null;
  joinedAt: string;
}

export type JoinWaitlistInput = z.input<typeof joinWaitlistSchema>;
export type UpdateWaitlistInput = z.input<typeof updateWaitlistSchema>;
export type WaitlistTokenInput = z.input<typeof waitlistTokenSchema>;
