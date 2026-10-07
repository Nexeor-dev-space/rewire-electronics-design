/**
 * Every API path, in one place. Hooks import from here — no path strings
 * inside hooks or components.
 */

import type { Emirate } from "@/lib/emirates";
import type { IntegrationKey } from "@/types/integration";

const V1 = "/api/v1";

export const API_ENDPOINTS = {
  auth: {
    signIn: `${V1}/auth/sign-in`,
    signOut: `${V1}/auth/sign-out`,
    signUp: `${V1}/auth/sign-up`,
    me: `${V1}/auth/me`,
    verifyEmail: `${V1}/auth/verify-email`,
    resendVerification: `${V1}/auth/resend-verification`,
    forgotPassword: `${V1}/auth/forgot-password`,
    resetPassword: `${V1}/auth/reset-password`,
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
    homepage: {
      draft: `${V1}/admin/homepage`,
      sections: `${V1}/admin/homepage/sections`,
      section: (id: string) => `${V1}/admin/homepage/sections/${id}`,
      order: `${V1}/admin/homepage/order`,
      publish: `${V1}/admin/homepage/publish`,
      discard: `${V1}/admin/homepage/discard`,
    },
    integrations: {
      status: `${V1}/admin/integrations`,
      mode: `${V1}/admin/integrations/mode`,
      credential: (key: IntegrationKey) => `${V1}/admin/integrations/credentials/${key}`,
    },
    coupons: {
      list: `${V1}/admin/coupons`,
      detail: (id: string) => `${V1}/admin/coupons/${id}`,
    },
    orders: {
      list: `${V1}/admin/orders`,
      detail: (number: string) => `${V1}/admin/orders/${number}`,
      status: (number: string) => `${V1}/admin/orders/${number}/status`,
      payment: (number: string) => `${V1}/admin/orders/${number}/payment`,
    },
    fulfilment: {
      list: `${V1}/admin/fulfilment`,
      detail: (number: string) => `${V1}/admin/fulfilment/${number}`,
    },
    returns: {
      list: `${V1}/admin/returns`,
      detail: (number: string) => `${V1}/admin/returns/${number}`,
      status: (number: string) => `${V1}/admin/returns/${number}/status`,
      refund: (number: string) => `${V1}/admin/returns/${number}/refund`,
    },
    storeSettings: `${V1}/admin/store-settings`,
    deliveryZones: {
      list: `${V1}/admin/delivery-zones`,
      detail: (emirate: Emirate) => `${V1}/admin/delivery-zones/${emirate}`,
    },
    roles: {
      list: `${V1}/admin/roles`,
      detail: (id: string) => `${V1}/admin/roles/${id}`,
    },
    auditLogs: {
      list: `${V1}/admin/audit-logs`,
    },
    trash: {
      products: `${V1}/admin/trash/products`,
      product: (id: string) => `${V1}/admin/trash/products/${id}`,
      restoreProduct: (id: string) => `${V1}/admin/trash/products/${id}/restore`,
      users: `${V1}/admin/trash/users`,
      user: (id: string) => `${V1}/admin/trash/users/${id}`,
      restoreUser: (id: string) => `${V1}/admin/trash/users/${id}/restore`,
    },
  },
  products: {
    list: `${V1}/products`,
    detail: (slug: string) => `${V1}/products/${slug}`,
  },
  search: {
    suggest: `${V1}/search`,
  },
  cart: {
    root: `${V1}/cart`,
    items: `${V1}/cart/items`,
    item: (id: string) => `${V1}/cart/items/${id}`,
    coupon: `${V1}/cart/coupon`,
    acknowledge: `${V1}/cart/acknowledge`,
    quote: `${V1}/cart/quote`,
  },
  checkout: {
    place: `${V1}/checkout`,
  },
  orders: {
    track: `${V1}/orders/track`,
  },
  account: {
    orders: `${V1}/account/orders`,
    order: (number: string) => `${V1}/account/orders/${number}`,
    returns: `${V1}/account/returns`,
    returnsEligible: `${V1}/account/returns/eligible`,
  },
  uploads: {
    images: `${V1}/uploads/images`,
  },
  media: {
    /** Serves raw bytes, not the JSON envelope — see docs/DATA-LAYER.md §4. */
    detail: (id: string) => `${V1}/media/${id}`,
  },
} as const;
