/**
 * Every API path, in one place. Hooks import from here — no path strings
 * inside hooks or components.
 */

const V1 = "/api/v1";

export const API_ENDPOINTS = {
  auth: {
    signIn: `${V1}/auth/sign-in`,
    signOut: `${V1}/auth/sign-out`,
  },
  admin: {
    customers: {
      list: `${V1}/admin/customers`,
      detail: (id: string) => `${V1}/admin/customers/${id}`,
    },
  },
} as const;
