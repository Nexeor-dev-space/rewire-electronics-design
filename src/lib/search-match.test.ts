import { describe, expect, it } from "vitest";
import { inIdOrder, likePattern } from "./search-match";

interface Row {
  id: string;
  name: string;
}

const row = (id: string, name: string): Row => ({ id, name });

describe("likePattern", () => {
  it("wraps a plain query in wildcards", () => {
    expect(likePattern("iphone")).toBe("%iphone%");
  });

  it("escapes a percent sign so it is matched literally", () => {
    expect(likePattern("50% off")).toBe("%50\\% off%");
  });

  it("escapes an underscore so it does not match any character", () => {
    expect(likePattern("a_b")).toBe("%a\\_b%");
  });

  it("escapes a backslash", () => {
    expect(likePattern("C:\\temp")).toBe("%C:\\\\temp%");
  });

  it("escapes every wildcard in one pass, never re-escaping its own backslash", () => {
    expect(likePattern("%_\\")).toBe("%\\%\\_\\\\%");
  });

  it("leaves an empty query as a bare wildcard, which callers guard against", () => {
    expect(likePattern("")).toBe("%%");
  });
});

describe("inIdOrder", () => {
  it("returns rows in id order, not row order", () => {
    const rows = [row("b", "Galaxy"), row("a", "iPhone"), row("c", "Pixel")];
    expect(inIdOrder(["a", "b", "c"], rows, (r) => r.id).map((r) => r.name)).toEqual([
      "iPhone",
      "Galaxy",
      "Pixel",
    ]);
  });

  it("drops ids with no row, which is how hidden categories disappear", () => {
    const rows = [row("a", "iPhone"), row("c", "Pixel")];
    expect(inIdOrder(["a", "b", "c"], rows, (r) => r.id).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("drops rows whose id was not asked for", () => {
    const rows = [row("a", "iPhone"), row("z", "Fenix")];
    expect(inIdOrder(["a"], rows, (r) => r.id).map((r) => r.id)).toEqual(["a"]);
  });

  it("returns nothing for no ids", () => {
    expect(inIdOrder([], [row("a", "iPhone")], (r) => r.id)).toEqual([]);
  });

  it("returns nothing for no rows", () => {
    expect(inIdOrder(["a"], [] as Row[], (r) => r.id)).toEqual([]);
  });
});
