import {
  FORGOT_PASSWORD_PAGE_PATH,
  NEXT_PATH_MAX_LENGTH,
  REGISTER_PAGE_PATH,
  RESET_PASSWORD_PAGE_PATH,
  SIGN_IN_PAGE_PATH,
  VERIFY_EMAIL_PAGE_PATH,
} from "@/lib/constants";

const AUTH_PATHS = [
  SIGN_IN_PAGE_PATH,
  REGISTER_PAGE_PATH,
  FORGOT_PASSWORD_PAGE_PATH,
  RESET_PASSWORD_PAGE_PATH,
  VERIFY_EMAIL_PAGE_PATH,
];

const SAFE_BASE = "http://x.invalid";
const UNSAFE_CHARS = /[\x00-\x1f\x7f\s]/;

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.length > NEXT_PATH_MAX_LENGTH) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (UNSAFE_CHARS.test(raw)) return null;

  let resolved: URL;
  try {
    resolved = new URL(raw, SAFE_BASE);
  } catch {
    return null;
  }
  if (resolved.origin !== SAFE_BASE) return null;

  const path = raw.split(/[?#]/)[0];
  if (AUTH_PATHS.some((authPath) => path === authPath || path.startsWith(`${authPath}/`))) {
    return null;
  }

  return raw;
}

export function signInHref(next?: string | null): string {
  const safe = safeNextPath(next);
  return safe ? `${SIGN_IN_PAGE_PATH}?next=${encodeURIComponent(safe)}` : SIGN_IN_PAGE_PATH;
}
