import { describe, expect, it } from "vitest";
import { inPriceBands } from "./shop";

describe("inPriceBands", () => {
  it("keeps every price when no band is chosen", () => {
    expect(inPriceBands(9_999_00, [])).toBe(true);
  });

  it("includes a band's lower edge and leaves out its upper edge", () => {
    expect(inPriceBands(500_00, ["500-1500"])).toBe(true);
    expect(inPriceBands(1_500_00, ["500-1500"])).toBe(false);
  });

  it("matches any one of several bands", () => {
    expect(inPriceBands(200_00, ["under-500", "3000-plus"])).toBe(true);
    expect(inPriceBands(1_000_00, ["under-500", "3000-plus"])).toBe(false);
  });

  it("has no upper edge on the top band", () => {
    expect(inPriceBands(50_000_00, ["3000-plus"])).toBe(true);
  });

  it("matches nothing for an unknown band, like the API", () => {
    expect(inPriceBands(200_00, ["unknown"])).toBe(false);
  });
});
