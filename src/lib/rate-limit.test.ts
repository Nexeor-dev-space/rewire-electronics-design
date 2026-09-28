import { describe, expect, it } from "vitest";
import { clientIp, hitWindow, type RateLimitWindow } from "./rate-limit";

const RULE = { limit: 3, windowSeconds: 60 };
const WINDOW_MS = RULE.windowSeconds * 1000;
const START = 1_000_000;
const MAX_KEYS = 100;

function hits(windows: Map<string, RateLimitWindow>, key: string, count: number, now: number) {
  return Array.from({ length: count }, () => hitWindow(windows, key, RULE, now, MAX_KEYS));
}

describe("hitWindow", () => {
  it("allows up to the limit inside one window and refuses the next", () => {
    const windows = new Map<string, RateLimitWindow>();
    const results = hits(windows, "a", RULE.limit + 1, START);
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
  });

  it("reports the seconds left in the window", () => {
    const windows = new Map<string, RateLimitWindow>();
    hits(windows, "a", RULE.limit, START);
    const blocked = hitWindow(windows, "a", RULE, START + 45_000, MAX_KEYS);
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 15 });
  });

  it("starts a fresh window once the old one has passed", () => {
    const windows = new Map<string, RateLimitWindow>();
    hits(windows, "a", RULE.limit + 1, START);
    expect(hitWindow(windows, "a", RULE, START + WINDOW_MS, MAX_KEYS).allowed).toBe(true);
  });

  it("counts keys separately", () => {
    const windows = new Map<string, RateLimitWindow>();
    hits(windows, "a", RULE.limit + 1, START);
    expect(hitWindow(windows, "b", RULE, START, MAX_KEYS).allowed).toBe(true);
  });

  it("drops expired windows first when the map is full", () => {
    const windows = new Map<string, RateLimitWindow>();
    hitWindow(windows, "live", RULE, START + WINDOW_MS / 2, 3);
    hitWindow(windows, "old-1", RULE, START - WINDOW_MS, 3);
    hitWindow(windows, "old-2", RULE, START - WINDOW_MS, 3);
    hitWindow(windows, "new", RULE, START + WINDOW_MS / 2, 3);
    expect([...windows.keys()].sort()).toEqual(["live", "new"]);
  });

  it("drops the oldest live windows when nothing has expired", () => {
    const windows = new Map<string, RateLimitWindow>();
    for (const key of ["a", "b", "c", "d"]) hitWindow(windows, key, RULE, START, 3);
    expect([...windows.keys()]).toEqual(["b", "c", "d"]);
  });
});

describe("clientIp", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

  it("takes the first x-forwarded-for hop", () => {
    expect(clientIp(request({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(request({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
  });

  it("uses unknown when neither header is set", () => {
    expect(clientIp(request({}))).toBe("unknown");
  });
});
