import { apiError } from "@/lib/api/api-response";
import { RATE_LIMIT_MAX_KEYS, RATE_LIMITS } from "@/lib/constants";

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export type RateLimitName = keyof typeof RATE_LIMITS;

const MS_PER_SECOND = 1000;
const UNKNOWN_CLIENT = "unknown";
const MESSAGE_RATE_LIMITED = "Too many attempts. Please wait a few minutes and try again.";

const store = new Map<string, RateLimitWindow>();

function makeRoom(windows: Map<string, RateLimitWindow>, now: number, maxKeys: number) {
  if (windows.size < maxKeys) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  for (const key of windows.keys()) {
    if (windows.size < maxKeys) break;
    windows.delete(key);
  }
}

export function hitWindow(
  windows: Map<string, RateLimitWindow>,
  key: string,
  rule: RateLimitRule,
  now: number,
  maxKeys: number,
): RateLimitResult {
  let window = windows.get(key);
  if (!window || window.resetAt <= now) {
    windows.delete(key);
    makeRoom(windows, now, maxKeys);
    window = { count: 0, resetAt: now + rule.windowSeconds * MS_PER_SECOND };
    windows.set(key, window);
  }

  window.count += 1;
  return {
    allowed: window.count <= rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / MS_PER_SECOND)),
  };
}

export function rateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  return hitWindow(store, key, rule, Date.now(), RATE_LIMIT_MAX_KEYS);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return req.headers.get("x-real-ip")?.trim() || UNKNOWN_CLIENT;
}

export function limitByIp(req: Request, name: RateLimitName): Response | null {
  return limitByKey(name, clientIp(req));
}

export function limitByUser(userId: string, name: RateLimitName): Response | null {
  return limitByKey(name, `user:${userId}`);
}

function limitByKey(name: RateLimitName, subject: string): Response | null {
  const result = rateLimit(`${name}:${subject}`, RATE_LIMITS[name]);
  if (result.allowed) return null;

  const response = apiError("RATE_LIMITED", MESSAGE_RATE_LIMITED, 429);
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  return response;
}
