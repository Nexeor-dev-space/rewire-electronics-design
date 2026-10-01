export const ADMIN_PAGE_SIZE = 20;
export const PICKER_PAGE_SIZE = 100;
export const SEARCH_DEBOUNCE_MS = 300;

export const SHOP_PAGE_SIZE = 12;
export const SHOP_MAX_PAGE_SIZE = 48;
export const SHOP_MAX_FILTER_VALUES = 50;
export const RELATED_PRODUCTS_LIMIT = 5;
export const FEATURED_PRODUCTS_LIMIT = 4;
export const SITEMAP_PRODUCT_LIMIT = 1000;
export const MAX_PRODUCT_ADD_ONS = 4;
export const NAV_CATEGORY_LIMIT = 8;
export const HOME_CATEGORY_LIMIT = 4;
export const STOREFRONT_CATEGORIES_REVALIDATE_SECONDS = 300;

export const DB_POOL_MAX = 5;

export const VAT_RATE_PERCENT = 5;
export const MAX_COUPON_TARGETS = 50;
export const COUPON_CODE_MIN_LENGTH = 3;
export const COUPON_CODE_MAX_LENGTH = 32;
export const COUPON_DESCRIPTION_MAX_LENGTH = 160;
export const MAX_DELIVERY_DAYS = 30;
export const CART_MAX_LINES = 20;
export const CART_MAX_LINE_QUANTITY = 5;
export const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const SMTP_DEFAULT_HOST = "smtp.gmail.com";
export const SMTP_DEFAULT_PORT = 587;
export const SMTP_IMPLICIT_TLS_PORT = 465;
export const SMTP_TIMEOUT_MS = 10_000;
export const DEV_APP_URL = "http://localhost:3000";
export const INTEGRATION_HINT_LENGTH = 4;
export const INTEGRATION_HINT_MIN_VALUE_LENGTH = 8;
export const INTEGRATION_VALUE_MAX_LENGTH = 512;

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const VERIFY_TOKEN_TTL_SECONDS = 60 * 60 * 24;
export const RESET_TOKEN_TTL_SECONDS = 60 * 60;
export const AUTH_TOKEN_BYTES = 32;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const ACCOUNT_HOME_PATH = "/account";
export const VERIFY_EMAIL_PAGE_PATH = "/verify-email";
export const RESET_PASSWORD_PAGE_PATH = "/reset-password";
export const RATE_LIMIT_MAX_KEYS = 10_000;
export const RATE_LIMITS = {
  signIn: { limit: 10, windowSeconds: 60 * 15 },
  signUp: { limit: 5, windowSeconds: 60 * 60 },
  forgotPassword: { limit: 5, windowSeconds: 60 * 60 },
  resendVerification: { limit: 3, windowSeconds: 60 * 60 },
  applyCoupon: { limit: 10, windowSeconds: 60 * 10 },
  guestCart: { limit: 10, windowSeconds: 60 * 60 },
} as const;
export const SIGN_IN_PAGE_PATH = "/sign-in";
export const REGISTER_PAGE_PATH = "/register";
export const FORGOT_PASSWORD_PAGE_PATH = "/forgot-password";

/** The Homepage Builder, the staff draft preview it opens, and the FAQ's editor. */
export const HOMEPAGE_BUILDER_PATH = "/admin/storefront/homepage";
export const HOMEPAGE_PREVIEW_PATH = "/preview/homepage";
export const FAQ_EDITOR_PATH = "/admin/storefront/content/faq";
export const FULL_NAME_MAX_LENGTH = 120;
export const NEXT_PATH_MAX_LENGTH = 512;
