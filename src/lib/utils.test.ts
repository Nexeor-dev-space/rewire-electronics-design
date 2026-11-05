import { describe, expect, it } from "vitest";
import { randomUuid } from "./utils";

describe("randomUuid", () => {
  it("returns a version 4 UUID", () => {
    expect(randomUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("returns a different value each call", () => {
    expect(randomUuid()).not.toBe(randomUuid());
  });
});
