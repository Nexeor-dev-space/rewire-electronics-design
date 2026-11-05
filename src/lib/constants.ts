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
export const MAX_WARRANTY_MONTHS = 60;
export const NAV_CATEGORY_LIMIT = 8;
export const HOME_CATEGORY_LIMIT = 4;
export const STOREFRONT_CATEGORIES_REVALIDATE_SECONDS = 300;

/** Storefront search: shared by the suggestions API and the `/search` page. */
export const SEARCH_QUERY_MAX_LENGTH = 100;
export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_WORDS = 5;
export const SEARCH_SUGGESTION_LIMITS = { products: 5, brands: 4, categories: 4 } as const;

export const DB_POOL_MAX = 5;
/** Interactive transactions with many writes (product save, place order); Prisma's default is 5 s. */
export const DB_WRITE_TIMEOUT_MS = 15_000;

/**
 * The store's clock. Times staff enter (a drop's release) are read in this
 * zone and times shoppers see are shown in it, whatever zone their device is
 * in. See `src/lib/dates.ts`.
 */
export const STORE_TIME_ZONE = "Asia/Dubai";
export const STORE_TIME_ZONE_LABEL = "GST";

/** The default VAT rate, used until an admin saves one in VAT & Configuration. */
export const VAT_RATE_PERCENT = 5;
export const VAT_RATE_MAX_PERCENT = 100;
export const LOW_STOCK_THRESHOLD = 5;
export const RELEASE_TITLE_MAX_LENGTH = 120;
export const RELEASE_SLUG_SUFFIX_BYTES = 3;
export const RELEASE_REMINDER_DEFAULTS_MINUTES = [2880, 60];
export const RELEASE_EDITION_MAX_LENGTH = 60;
export const RELEASE_DESCRIPTION_MAX_LENGTH = 2000;
export const RELEASE_MAX_PER_CUSTOMER_DEFAULT = 1;
export const RELEASE_MAX_PER_CUSTOMER_LIMIT = 20;
export const RELEASE_ALLOCATIONS_MAX = 50;
export const RELEASE_EARLY_END_OPENING_SHIFT_MS = 1;
export const RELEASES_PAGE_PATH = "/releases";
export const RELEASES_PAGE_SIZE = 12;
export const WAITLIST_CONFIRM_LINK_TTL_SECONDS = 60 * 60 * 48;
export const WAITLIST_LEAVE_LINK_TTL_SECONDS = 60 * 60 * 24 * 180;
export const WAITLIST_ADMIN_PAGE_SIZE = 50;
export const WAITLIST_CONFIRM_PAGE_PATH = "/waitlist/confirm";
export const WAITLIST_LEAVE_PAGE_PATH = "/waitlist/leave";
export const MAX_COUPON_TARGETS = 50;
export const COUPON_CODE_MIN_LENGTH = 3;
export const COUPON_CODE_MAX_LENGTH = 32;
export const COUPON_DESCRIPTION_MAX_LENGTH = 160;
export const CAMPAIGN_NAME_MAX_LENGTH = 120;
export const CAMPAIGN_DESCRIPTION_MAX_LENGTH = 1000;
export const CAMPAIGN_SLUG_MAX_LENGTH = 140;
export const CAMPAIGN_TYPE_NAME_MAX_LENGTH = 60;
export const CAMPAIGN_CONTENT_MAX_LENGTH = 5000;
export const CAMPAIGN_CTA_LABEL_MAX_LENGTH = 40;
export const CAMPAIGN_CTA_HREF_MAX_LENGTH = 300;
export const MAX_CAMPAIGN_IMAGES = 6;
export const MAX_CAMPAIGN_PRODUCTS = 50;
/** Caps the types so the type dropdown is one bounded query. */
export const MAX_CAMPAIGN_TYPES = 50;
/** A percent discount stops short of 100, so nothing is ever free. */
export const CAMPAIGN_MAX_PERCENT = 99;
/** Postgres advisory lock taken while checking that two campaigns don't overlap. */
export const CAMPAIGN_DATES_LOCK_KEY = 7109;
export const ADMIN_CAMPAIGNS_PATH = "/admin/marketing/campaigns";
export const MAX_DELIVERY_DAYS = 30;
export const DELIVERY_AREA_MAX_LENGTH = 100;
/** Caps one emirate's areas so the checkout dropdown stays one bounded query. */
export const MAX_DELIVERY_AREAS_PER_EMIRATE = 300;
export const CART_MAX_LINES = 20;
export const CART_MAX_LINE_QUANTITY = 5;
export const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const RETURN_WINDOW_DAYS = 30;
export const RETURN_WINDOW_MAX_DAYS = 365;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const ORDER_NUMBER_PREFIX = "RW-";
export const REFERENCE_NUMBER_DIGITS = 8;
export const REFERENCE_NUMBER_ATTEMPTS = 3;
export const ACCOUNT_LIST_PAGE_SIZE = 10;
export const WAITLIST_PAGE_SIZE = ACCOUNT_LIST_PAGE_SIZE;
export const ORDER_NOTE_MAX_LENGTH = 500;
export const STAFF_NOTE_MAX_LENGTH = 1000;
export const TRACKING_NUMBER_MAX_LENGTH = 64;
export const SERIAL_NUMBER_MAX_LENGTH = 120;
export const ORDER_EVENT_LIMIT = 50;
export const ORDER_RETURNS_LIMIT = 50;
export const RETURN_NUMBER_PREFIX = "RT-";
export const RETURN_DETAIL_MIN_LENGTH = 4;
export const RETURN_DETAIL_MAX_LENGTH = 1000;
export const REFUND_REFERENCE_MAX_LENGTH = 100;
export const WARRANTY_CLAIM_NUMBER_PREFIX = "WC-";
export const WARRANTY_CLAIM_ISSUE_MIN_LENGTH = 4;
export const WARRANTY_CLAIM_ISSUE_MAX_LENGTH = 1000;
export const WARRANTY_CLAIMS_LIMIT = 50;
/** Reports: a trend goes daily up to this many days and monthly beyond, so a chart stays readable. */
export const REPORT_DAILY_BUCKET_MAX_DAYS = 92;
export const REPORT_MAX_RANGE_DAYS = 1830;
export const REPORT_TOP_PRODUCTS_LIMIT = 20;
export const REPORT_TOP_COUPONS_LIMIT = 10;
export const REPORT_EXPORT_PAGE_SIZE = 100;
export const ORDER_TRACK_PAGE_PATH = "/order/track";
export const ABOUT_PAGE_PATH = "/about";
export const SUPPORT_PAGE_PATH = "/support";
export const CART_PAGE_PATH = "/cart";
/** Tax invoices: `INV-<year>-<sequence>`, see docs/INVOICES.md. */
export const INVOICE_NUMBER_PREFIX = "INV-";
export const INVOICE_SEQUENCE_DIGITS = 6;
export const INVOICE_TITLE = "Tax Invoice";
export const INVOICE_FOOTER_NOTE = "Computer-generated tax invoice - No signature required";
export const INVOICE_SELLER_FIELD_MAX_LENGTH = 200;
export const INVOICE_TERMS_MAX_LENGTH = 2000;
export const WISHLIST_PAGE_PATH = "/wishlist";
export const ACCOUNT_ORDERS_PATH = "/account/orders";
export const ACCOUNT_RETURNS_PATH = "/account/returns";
export const ACCOUNT_RECENT_ORDERS_LIMIT = 3;
export const CHECKOUT_PAGE_PATH = "/checkout";
export const CHECKOUT_SUCCESS_PAGE_PATH = "/checkout/success";

/** How long Stripe's payment page stays open (Stripe allows 30 minutes to 24 hours). */
export const CHECKOUT_PAYMENT_WINDOW_MINUTES = 30;
/** A retried checkout reuses the order's open Stripe page only while at least this much time is left. */
export const CHECKOUT_SESSION_REUSE_MIN_MINUTES = 5;
export const MS_PER_MINUTE = 60 * 1000;
/** Query keys on the success page that Stripe returns the customer to. */
export const CHECKOUT_SESSION_ID_PARAM = "session_id";
export const PAYMENT_RESULT_PARAM = "payment";
export const PAYMENT_CANCELLED_VALUE = "cancelled";

export const AUTH_SECRET_MIN_LENGTH = 32;
export const SMTP_DEFAULT_HOST = "smtp.gmail.com";
export const SMTP_DEFAULT_PORT = 587;
export const SMTP_IMPLICIT_TLS_PORT = 465;
export const SMTP_TIMEOUT_MS = 10_000;
export const DEV_APP_URL = "http://localhost:3000";

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
  search: { limit: 60, windowSeconds: 60 },
  placeOrder: { limit: 10, windowSeconds: 60 * 10 },
  trackOrder: { limit: 10, windowSeconds: 60 * 15 },
  confirmPayment: { limit: 20, windowSeconds: 60 * 10 },
  returnRequest: { limit: 10, windowSeconds: 60 * 60 },
  joinWaitlist: { limit: 5, windowSeconds: 60 * 15 },
} as const;
export const SIGN_IN_PAGE_PATH = "/sign-in";
export const REGISTER_PAGE_PATH = "/register";
export const FORGOT_PASSWORD_PAGE_PATH = "/forgot-password";
export const SESSION_EXPIRED_PARAM = "expired";

/** The Homepage Builder, the staff draft preview it opens, and the FAQ's editor. */
export const HOMEPAGE_BUILDER_PATH = "/admin/storefront/homepage";
export const HOMEPAGE_SECTION_PARAM = "section";
export const HOMEPAGE_PREVIEW_PATH = "/preview/homepage";
export const FAQ_EDITOR_PATH = "/admin/storefront/content/faq";
/** Where staff accounts and their roles are managed, linked from the Roles screen. */
export const STAFF_ACCOUNTS_PATH = "/admin/users/staff";
export const ADMIN_RETURNS_PATH = "/admin/returns";
export const ADMIN_WARRANTY_PATH = "/admin/service/warranty";
export const ADMIN_WARRANTY_CLAIMS_PATH = "/admin/service/claims";
/** The console's light / dark choice, per browser. No cookie means follow the OS. */
export const ADMIN_THEME_COOKIE = "rewire_admin_theme";
export const ADMIN_THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const STAFF_ROLE_NAME_MAX_LENGTH = 60;
export const STAFF_ROLE_DESCRIPTION_MAX_LENGTH = 200;

/** Product SEO field limits: what search results and share cards show before truncating. */
export const SEO_TITLE_MAX_LENGTH = 70;
export const SEO_DESCRIPTION_MAX_LENGTH = 160;
export const OG_TITLE_MAX_LENGTH = 95;
export const OG_DESCRIPTION_MAX_LENGTH = 200;
export const SEO_KEYWORDS_MAX = 10;
export const SEO_KEYWORD_MAX_LENGTH = 40;
export const CANONICAL_URL_MAX_LENGTH = 512;
export const NOINDEX_ROBOTS = { index: false, follow: false } as const;
export const FULL_NAME_MAX_LENGTH = 120;
export const NEXT_PATH_MAX_LENGTH = 512;
export const HOMEPAGE_DROPS_LIMIT = 5;
export const SITEMAP_RELEASE_LIMIT = 1000;
export const ADMIN_RELEASES_PATH = "/admin/releases";

/** Bulk product upload limits; see docs/BULK-UPLOAD.md. */
export const PRODUCT_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMPORT_MAX_ROWS = 500;
export const PRODUCT_IMPORT_MAX_CELL_LENGTH = 5000;
export const PRODUCT_IMPORT_IMAGE_CHECK_TIMEOUT_MS = 3_000;
export const PRODUCT_IMPORT_IMAGE_CHECK_CONCURRENCY = 8;
/** Products an import saves per request, and how long one image download may take. */
export const PRODUCT_IMPORT_BATCH_SIZE = 20;
/** Distinct image addresses in one file; each is checked and downloaded, so the file is capped. */
export const PRODUCT_IMPORT_MAX_IMAGES = 100;
/** A claimed row older than this was left by a request that died, and is picked up again. */
export const PRODUCT_IMPORT_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
/** Batches in a row that save nothing before the screen gives up asking. */
export const PRODUCT_IMPORT_MAX_STALLED_CALLS = 3;
export const PRODUCT_IMPORT_IMAGE_FETCH_TIMEOUT_MS = 10_000;
export const ADMIN_PRODUCT_IMPORT_HISTORY_PATH = "/admin/products/upload-history";
