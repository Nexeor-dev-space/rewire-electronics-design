import { describe, expect, it } from "vitest";
import { z } from "zod";
import { randomUuid } from "@/lib/utils";

describe("randomUuid", () => {
  it("makes a version 4 UUID the checkout validator accepts", () => {
    for (let i = 0; i < 50; i++) {
      const id = randomUuid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(z.uuid().safeParse(id).success).toBe(true);
    }
  });

  it("does not repeat", () => {
    expect(randomUuid()).not.toBe(randomUuid());
  });
});
