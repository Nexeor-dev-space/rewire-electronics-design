import { describe, expect, it } from "vitest";
import { ADMIN_GUIDES, adminGuideSlugFor } from "@/lib/user-guides/admin-guides";
import { defaultGuide } from "@/lib/user-guides/catalogue";
import { CUSTOMER_GUIDES } from "@/lib/user-guides/customer-guides";
import { isRecordingUrl } from "@/lib/user-guides/recording";
import { helpGuideSchema } from "@/validators/help-guide.validator";

const valid = {
  title: "Orders",
  summary: "Follow an order.",
  recordingUrl: "",
  sections: [{ id: "steps", title: "Steps", steps: [{ text: "Open it.", imageId: null }], notes: [] }],
};

describe("helpGuideSchema", () => {
  it("accepts a guide and turns a blank recording into null", () => {
    const result = helpGuideSchema.safeParse(valid);
    expect(result.success && result.data.recordingUrl).toBe(null);
  });

  it("rejects an empty title, no sections and a blank step", () => {
    expect(helpGuideSchema.safeParse({ ...valid, title: " " }).success).toBe(false);
    expect(helpGuideSchema.safeParse({ ...valid, sections: [] }).success).toBe(false);
    const blank = [{ ...valid.sections[0], steps: [{ text: "", imageId: null }] }];
    expect(helpGuideSchema.safeParse({ ...valid, sections: blank }).success).toBe(false);
  });

  it("rejects repeated section ids", () => {
    const twice = [valid.sections[0], valid.sections[0]];
    expect(helpGuideSchema.safeParse({ ...valid, sections: twice }).success).toBe(false);
  });

  it("accepts every built in guide", () => {
    for (const definition of [...CUSTOMER_GUIDES, ...ADMIN_GUIDES]) {
      const guide = defaultGuide(definition);
      expect(helpGuideSchema.safeParse({ ...guide, recordingUrl: "" }).success, definition.slug).toBe(true);
    }
  });
});

describe("isRecordingUrl", () => {
  it("accepts https video files", () => {
    expect(isRecordingUrl("https://cdn.example.com/a/clip.mp4")).toBe(true);
    expect(isRecordingUrl("https://cdn.example.com/clip.WEBM?x=1")).toBe(true);
  });

  it("rejects other links", () => {
    expect(isRecordingUrl("http://cdn.example.com/clip.mp4")).toBe(false);
    expect(isRecordingUrl("https://youtube.com/watch?v=1")).toBe(false);
    expect(isRecordingUrl("not a url")).toBe(false);
  });
});

describe("guide catalogue", () => {
  it("has unique slugs per audience", () => {
    for (const list of [CUSTOMER_GUIDES, ADMIN_GUIDES]) {
      expect(new Set(list.map((guide) => guide.slug)).size).toBe(list.length);
    }
  });

  it("finds a guide for a screen or its parent", () => {
    expect(adminGuideSlugFor(["orders", undefined])).toBe("orders");
    expect(adminGuideSlugFor(["trash-products", "trash"])).toBe("trash");
    expect(adminGuideSlugFor(["users"])).toBe(null);
  });
});
