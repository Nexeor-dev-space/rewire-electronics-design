/**
 * Every API path, in one place. Hooks import from here — no path strings
 * inside hooks or components.
 */

import type { Emirate } from "@/lib/emirates";
import type { ReportKey } from "@/lib/reports";

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
    productImports: {
      list: `${V1}/admin/product-imports`,
      validate: `${V1}/admin/product-imports/validate`,
      detail: (id: string) => `${V1}/admin/product-imports/${id}`,
      rows: (id: string) => `${V1}/admin/product-imports/${id}/rows`,
      process: (id: string) => `${V1}/admin/product-imports/${id}/process`,
      errors: (id: string) => `${V1}/admin/product-imports/${id}/errors`,
    },
    addOns: {
      list: `${V1}/admin/add-ons`,
      detail: (id: string) => `${V1}/admin/add-ons/${id}`,
    },
    homepage: {
      draft: `${V1}/admin/homepage`,
      sections: `${V1}/admin/homepage/sections`,
      section: (id: string) => `${V1}/admin/homepage/sections/${id}`,
      order: `${V1}/admin/homepage/order`,
      publish: `${V1}/admin/homepage/publish`,
      discard: `${V1}/admin/homepage/discard`,
      seo: `${V1}/admin/homepage/seo`,
    },
    releases: {
      list: `${V1}/admin/releases`,
      detail: (id: string) => `${V1}/admin/releases/${id}`,
      state: (id: string) => `${V1}/admin/releases/${id}/state`,
      allocations: (id: string) => `${V1}/admin/releases/${id}/allocations`,
      waitlist: (id: string) => `${V1}/admin/releases/${id}/waitlist`,
    },
    coupons: {
      list: `${V1}/admin/coupons`,
      detail: (id: string) => `${V1}/admin/coupons/${id}`,
    },
    campaigns: {
      list: `${V1}/admin/campaigns`,
      detail: (id: string) => `${V1}/admin/campaigns/${id}`,
      status: (id: string) => `${V1}/admin/campaigns/${id}/status`,
      types: `${V1}/admin/campaign-types`,
      type: (id: string) => `${V1}/admin/campaign-types/${id}`,
    },
    orders: {
      list: `${V1}/admin/orders`,
      detail: (number: string) => `${V1}/admin/orders/${number}`,
      status: (number: string) => `${V1}/admin/orders/${number}/status`,
      payment: (number: string) => `${V1}/admin/orders/${number}/payment`,
      /** Serves a PDF, not the JSON envelope — see docs/INVOICES.md. */
      invoice: (number: string) => `${V1}/admin/orders/${number}/invoice`,
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
    support: {
      list: `${V1}/admin/support`,
      detail: (number: string) => `${V1}/admin/support/${number}`,
      status: (number: string) => `${V1}/admin/support/${number}/status`,
      priority: (number: string) => `${V1}/admin/support/${number}/priority`,
      assignee: (number: string) => `${V1}/admin/support/${number}/assignee`,
      messages: (number: string) => `${V1}/admin/support/${number}/messages`,
      assignees: `${V1}/admin/support/assignees`,
      categories: `${V1}/admin/support/categories`,
      category: (id: string) => `${V1}/admin/support/categories/${id}`,
      settings: `${V1}/admin/support/settings`,
    },
    warranties: {
      list: `${V1}/admin/warranties`,
      detail: (id: string) => `${V1}/admin/warranties/${id}`,
      claims: (id: string) => `${V1}/admin/warranties/${id}/claims`,
    },
    warrantyClaims: {
      detail: (number: string) => `${V1}/admin/warranty-claims/${number}`,
      status: (number: string) => `${V1}/admin/warranty-claims/${number}/status`,
    },
    reports: {
      detail: (report: ReportKey) => `${V1}/admin/reports/${report}`,
    },
    storeSettings: `${V1}/admin/store-settings`,
    dashboard: `${V1}/admin/dashboard`,
    vatSettings: `${V1}/admin/vat-settings`,
    invoiceSettings: `${V1}/admin/invoice-settings`,
    deliveryZones: {
      list: `${V1}/admin/delivery-zones`,
      detail: (emirate: Emirate) => `${V1}/admin/delivery-zones/${emirate}`,
    },
    deliveryAreas: {
      list: `${V1}/admin/delivery-areas`,
      detail: (id: string) => `${V1}/admin/delivery-areas/${id}`,
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
  search: `${V1}/search`,
  wishlist: `${V1}/wishlist`,
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
    confirmPayment: `${V1}/checkout/payment`,
  },
  deliveryAreas: `${V1}/delivery-areas`,
  orders: {
    track: `${V1}/orders/track`,
  },
  account: {
    orders: `${V1}/account/orders`,
    order: (number: string) => `${V1}/account/orders/${number}`,
    /** Serves a PDF, not the JSON envelope — see docs/INVOICES.md. */
    orderInvoice: (number: string) => `${V1}/account/orders/${number}/invoice`,
    returns: `${V1}/account/returns`,
    returnsEligible: `${V1}/account/returns/eligible`,
    addresses: `${V1}/account/addresses`,
  },
  support: {
    tickets: `${V1}/support/tickets`,
    categories: `${V1}/support/categories`,
  },
  storefrontReleases: {
    waitlist: (slug: string) => `${V1}/releases/${slug}/waitlist`,
  },
  waitlist: {
    confirm: `${V1}/waitlist/confirm`,
    leave: `${V1}/waitlist/leave`,
    mine: `${V1}/account/waitlists`,
    entry: (id: string) => `${V1}/account/waitlists/${id}`,
  },
  uploads: {
    images: `${V1}/uploads/images`,
  },
  media: {
    /** Serves raw bytes, not the JSON envelope — see docs/DATA-LAYER.md §4. */
    detail: (id: string) => `${V1}/media/${id}`,
  },
} as const;
