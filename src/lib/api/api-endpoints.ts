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
    users: {
      list: `${V1}/admin/users`,
      detail: (id: string) => `${V1}/admin/users/${id}`,
    },
    categories: {
      list: `${V1}/admin/categories`,
      detail: (id: string) => `${V1}/admin/categories/${id}`,
      status: (id: string) => `${V1}/admin/categories/${id}/status`,
    },
    brands: {
      list: `${V1}/admin/brands`,
      detail: (id: string) => `${V1}/admin/brands/${id}`,
    },
    products: {
      list: `${V1}/admin/products`,
      detail: (id: string) => `${V1}/admin/products/${id}`,
      status: (id: string) => `${V1}/admin/products/${id}/status`,
    },
    addOns: {
      list: `${V1}/admin/add-ons`,
      detail: (id: string) => `${V1}/admin/add-ons/${id}`,
    },
    inventory: {
      list: `${V1}/admin/inventory`,
      detail: (variantId: string) => `${V1}/admin/inventory/${variantId}`,
    },
  },
  products: {
    list: `${V1}/products`,
    detail: (slug: string) => `${V1}/products/${slug}`,
  },
  uploads: {
    images: `${V1}/uploads/images`,
  },
  media: {
    /** Serves raw bytes, not the JSON envelope — see docs/DATA-LAYER.md §4. */
    detail: (id: string) => `${V1}/media/${id}`,
  },
} as const;
