import { describe, expect, it } from "vitest";
import { NEXT_PATH_MAX_LENGTH } from "@/lib/constants";
import { safeNextPath, signInHref } from "./next-path";

describe("safeNextPath", () => {
  it("keeps a same-site path with its query and hash", () => {
    expect(safeNextPath("/account/orders?page=2#top")).toBe("/account/orders?page=2#top");
    expect(safeNextPath("/")).toBe("/");
  });

  it("rejects empty and missing values", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.example/account")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("account")).toBeNull();
  });

  it("rejects paths the URL parser would move to another host", () => {
    expect(safeNextPath("/\t/evil.example")).toBeNull();
    expect(safeNextPath("/\n/evil.example")).toBeNull();
  });

  it("rejects auth pages so a sign-in never loops back to itself", () => {
    expect(safeNextPath("/sign-in")).toBeNull();
    expect(safeNextPath("/sign-in/?next=/account")).toBeNull();
    expect(safeNextPath("/register")).toBeNull();
    expect(safeNextPath("/forgot-password")).toBeNull();
    expect(safeNextPath("/reset-password?token=x")).toBeNull();
    expect(safeNextPath("/verify-email")).toBeNull();
  });

  it("rejects paths over the length limit", () => {
    const path = `/${"a".repeat(NEXT_PATH_MAX_LENGTH)}`;
    expect(safeNextPath(path)).toBeNull();
    expect(safeNextPath(path.slice(0, NEXT_PATH_MAX_LENGTH))).toBe(path.slice(0, NEXT_PATH_MAX_LENGTH));
  });
});

describe("signInHref", () => {
  it("adds a safe next path", () => {
    expect(signInHref("/account/orders")).toBe("/sign-in?next=%2Faccount%2Forders");
  });

  it("drops an unsafe or missing next path", () => {
    expect(signInHref("//evil.example")).toBe("/sign-in");
    expect(signInHref(null)).toBe("/sign-in");
  });
});

describe("signInHref with expired", () => {
  it("adds expired=1 after a safe next path", () => {
    expect(signInHref("/account", { expired: true })).toBe("/sign-in?next=%2Faccount&expired=1");
  });

  it("adds expired=1 alone when next is missing or unsafe", () => {
    expect(signInHref(null, { expired: true })).toBe("/sign-in?expired=1");
    expect(signInHref("//evil.example", { expired: true })).toBe("/sign-in?expired=1");
  });

  it("leaves the link unchanged without the option", () => {
    expect(signInHref("/account")).toBe("/sign-in?next=%2Faccount");
  });
});
