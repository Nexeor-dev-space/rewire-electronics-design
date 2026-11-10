import { describe, expect, it } from "vitest";
import { RELEASES_PAGE_SIZE } from "@/lib/constants";
import { joinWaitlistSchema, storefrontReleasesQuerySchema, updateWaitlistSchema } from "./waitlist.validator";

describe("joinWaitlistSchema", () => {
  it("lowercases and trims the email and defaults the opt-ins", () => {
    const result = joinWaitlistSchema.parse({ email: "  Shopper@Example.COM " });
    expect(result).toEqual({ email: "shopper@example.com", emailOptIn: true, whatsappOptIn: false, phone: null });
  });

  it("needs a phone for WhatsApp", () => {
    const result = joinWaitlistSchema.safeParse({ email: "a@example.com", whatsappOptIn: true });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["phone"]);
  });

  it("keeps a phone given for WhatsApp", () => {
    const result = joinWaitlistSchema.parse({ email: "a@example.com", whatsappOptIn: true, phone: " +971 50 123 4567 " });
    expect(result.phone).toBe("+971501234567");
  });

  it("refuses a bad email or phone", () => {
    expect(joinWaitlistSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(joinWaitlistSchema.safeParse({ email: "a@example.com", phone: "abc" }).success).toBe(false);
  });
});

describe("updateWaitlistSchema", () => {
  it("needs both opt-ins and a phone for WhatsApp", () => {
    expect(updateWaitlistSchema.safeParse({ emailOptIn: true }).success).toBe(false);
    expect(updateWaitlistSchema.safeParse({ emailOptIn: false, whatsappOptIn: true, phone: "" }).success).toBe(false);
    expect(updateWaitlistSchema.parse({ emailOptIn: false, whatsappOptIn: false, phone: "" }).phone).toBeNull();
  });
});

describe("storefrontReleasesQuerySchema", () => {
  it("defaults to the first page of the releases page size and caps it", () => {
    expect(storefrontReleasesQuerySchema.parse({})).toEqual({ page: 1, pageSize: RELEASES_PAGE_SIZE });
    expect(storefrontReleasesQuerySchema.safeParse({ pageSize: RELEASES_PAGE_SIZE + 1 }).success).toBe(false);
  });
});
