"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getWishlistSeed } from "@/lib/catalog";

/**
 * Customer state for the navigation and cart — session and line items.
 *
 * ⚠ This is a front-end stand-in, not auth or a real basket. It persists to
 * localStorage so the navigation and cart page are reviewable today; every
 * field and method below is shaped to be replaced by the real session
 * (NextAuth / Payload / custom) and the real cart adapter without touching
 * a single component. The swap points:
 *
 *   signIn()       → redirect to the auth route, or the provider's sign-in call
 *   signOut()      → the provider's sign-out call
 *   items          → the cart adapter's line items (server-owned, hydrated in)
 *   addItem()/…    → the cart adapter's line mutations
 *
 * Hydration: the server and first client render are always signed-out with an
 * empty cart. Persisted state is read *after* mount, so markup never differs
 * between server and client. `ready` tells the UI when that read has happened,
 * which is what stops the cart badge flashing in on every page load.
 */

export interface AccountUser {
  name: string;
  email: string;
}

/**
 * Line item — the smallest unit the cart tracks. Storage and colour are
 * not yet on this record because the current product page does not
 * propagate a selection; when it does, add them here and a duplicate
 * product + variant should merge quantities, while distinct variants
 * should stay on separate lines.
 */
export interface CartItem {
  /** Stable line id — used as the React key and the mutation target. */
  id: string;
  productSlug: string;
  quantity: number;
}

interface AccountContextValue {
  user: AccountUser | null;
  /** False until persisted state has been read on the client. */
  ready: boolean;
  items: CartItem[];
  /** Sum of quantities. Derived, so the nav badge and the cart agree. */
  cartCount: number;
  /** Saved product slugs, ordered newest first. */
  wishlistSlugs: string[];
  isSaved: (productSlug: string) => boolean;
  toggleSaved: (productSlug: string) => void;
  removeSaved: (productSlug: string) => void;
  signIn: () => void;
  signOut: () => void;
  addItem: (productSlug: string, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const SESSION_KEY = "rewire.session";
const CART_KEY = "rewire.cart.v2";
const WISHLIST_KEY = "rewire.wishlist.v1";
/** Marks a browser as having been seeded once. See `demoSeed` below. */
const SEED_MARKER_KEY = "rewire.cart.seeded";
/** Same idea for the wishlist — one seed per browser, then hands off. */
const WISHLIST_SEED_MARKER_KEY = "rewire.wishlist.seeded";

/** Stand-in customer, used until real auth lands. */
const DEMO_USER: AccountUser = {
  name: "Alex Mercer",
  email: "alex@example.com",
};

/**
 * Reviewer aid — three products dropped into the cart on the very first
 * visit so /cart is not an empty page for someone who has just arrived.
 * The marker fires once per browser; emptying the cart afterwards
 * persists, so the empty state is still reachable. Delete this and its
 * caller when a real Add-to-Bag flow starts populating the cart.
 */
const DEMO_SEED: CartItem[] = [
  { id: "seed-1", productSlug: "iphone-15-pro-max", quantity: 1 },
  { id: "seed-2", productSlug: "macbook-air-13-m2", quantity: 1 },
  { id: "seed-3", productSlug: "airpods-pro-2", quantity: 2 },
];

const AccountContext = createContext<AccountContextValue | null>(null);

/** Small, collision-safe line id — sortable by creation without a real uuid. */
function makeLineId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${rand}`;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // Read persisted state only after mount — see the hydration note above.
  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem(SESSION_KEY);
      if (storedUser) setUser(JSON.parse(storedUser) as AccountUser);

      const storedCart = window.localStorage.getItem(CART_KEY);
      if (storedCart) {
        const parsed = JSON.parse(storedCart) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed.filter(isValidLine));
      } else if (!window.localStorage.getItem(SEED_MARKER_KEY)) {
        // First-ever visit → seed for reviewability, then remember we did.
        setItems(DEMO_SEED);
        window.localStorage.setItem(CART_KEY, JSON.stringify(DEMO_SEED));
        window.localStorage.setItem(SEED_MARKER_KEY, "1");
      }

      const storedWishlist = window.localStorage.getItem(WISHLIST_KEY);
      if (storedWishlist) {
        const parsed = JSON.parse(storedWishlist) as unknown;
        if (Array.isArray(parsed)) {
          setWishlistSlugs(parsed.filter((s): s is string => typeof s === "string"));
        }
      } else if (!window.localStorage.getItem(WISHLIST_SEED_MARKER_KEY)) {
        // Same first-visit-only seeding pattern as the cart above, so the
        // wishlist page is reviewable without hand-populating localStorage.
        const seed = getWishlistSeed();
        setWishlistSlugs(seed);
        window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(seed));
        window.localStorage.setItem(WISHLIST_SEED_MARKER_KEY, "1");
      }
    } catch {
      // Private mode, disabled storage — a signed-out shell is a fine default.
    }
    setReady(true);
  }, []);

  const persistItems = useCallback((next: CartItem[]) => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — state still works for this session */
    }
  }, []);

  const persist = useCallback((key: string, value: string | null) => {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const signIn = useCallback(() => {
    setUser(DEMO_USER);
    persist(SESSION_KEY, JSON.stringify(DEMO_USER));
  }, [persist]);

  const signOut = useCallback(() => {
    setUser(null);
    persist(SESSION_KEY, null);
  }, [persist]);

  const addItem = useCallback(
    (productSlug: string, quantity = 1) => {
      setItems((current) => {
        const existing = current.find((line) => line.productSlug === productSlug);
        const next = existing
          ? current.map((line) =>
              line.id === existing.id
                ? { ...line, quantity: clampQty(line.quantity + quantity) }
                : line,
            )
          : [
              ...current,
              { id: makeLineId(), productSlug, quantity: clampQty(quantity) },
            ];
        persistItems(next);
        return next;
      });
    },
    [persistItems],
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      setItems((current) => {
        const clamped = clampQty(quantity);
        if (clamped === 0) {
          const next = current.filter((line) => line.id !== id);
          persistItems(next);
          return next;
        }
        const next = current.map((line) =>
          line.id === id ? { ...line, quantity: clamped } : line,
        );
        persistItems(next);
        return next;
      });
    },
    [persistItems],
  );

  const removeItem = useCallback(
    (id: string) => {
      setItems((current) => {
        const next = current.filter((line) => line.id !== id);
        persistItems(next);
        return next;
      });
    },
    [persistItems],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    persistItems([]);
  }, [persistItems]);

  const persistWishlist = useCallback((next: string[]) => {
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const addSaved = useCallback(
    (productSlug: string) => {
      setWishlistSlugs((current) => {
        if (current.includes(productSlug)) return current;
        // Newest first — matches how any reader scans a saved-items list.
        const next = [productSlug, ...current];
        persistWishlist(next);
        return next;
      });
    },
    [persistWishlist],
  );

  const removeSaved = useCallback(
    (productSlug: string) => {
      setWishlistSlugs((current) => {
        if (!current.includes(productSlug)) return current;
        const next = current.filter((slug) => slug !== productSlug);
        persistWishlist(next);
        return next;
      });
    },
    [persistWishlist],
  );

  const toggleSaved = useCallback(
    (productSlug: string) => {
      setWishlistSlugs((current) => {
        const next = current.includes(productSlug)
          ? current.filter((slug) => slug !== productSlug)
          : [productSlug, ...current];
        persistWishlist(next);
        return next;
      });
    },
    [persistWishlist],
  );

  const isSaved = useCallback(
    (productSlug: string) => wishlistSlugs.includes(productSlug),
    [wishlistSlugs],
  );

  const cartCount = useMemo(
    () => items.reduce((sum, line) => sum + line.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      user,
      ready,
      items,
      cartCount,
      wishlistSlugs,
      isSaved,
      toggleSaved,
      removeSaved,
      signIn,
      signOut,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      user,
      ready,
      items,
      cartCount,
      wishlistSlugs,
      isSaved,
      toggleSaved,
      removeSaved,
      signIn,
      signOut,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used inside <AccountProvider>");
  }
  return context;
}

/** Hard cap on any single line — the buy panel enforces the same ceiling. */
function clampQty(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(99, Math.max(0, Math.floor(quantity)));
}

function isValidLine(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<CartItem>;
  return (
    typeof line.id === "string" &&
    typeof line.productSlug === "string" &&
    typeof line.quantity === "number" &&
    line.quantity > 0
  );
}
