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

/**
 * Customer state for the navigation — session and cart.
 *
 * ⚠ This is a front-end stand-in, not auth. It persists to localStorage so
 * both navigation states are reviewable today; every field and method below
 * is shaped to be replaced by the real session (NextAuth / Payload / custom)
 * and the real cart without touching a single component. The swap points:
 *
 *   signIn()  → redirect to the auth route, or the provider's sign-in call
 *   signOut() → the provider's sign-out call
 *   cart      → the cart adapter's line-item count
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

interface AccountContextValue {
  user: AccountUser | null;
  /** False until persisted state has been read on the client. */
  ready: boolean;
  cartCount: number;
  signIn: () => void;
  signOut: () => void;
  addToCart: (quantity?: number) => void;
  clearCart: () => void;
}

const SESSION_KEY = "rewire.session";
const CART_KEY = "rewire.cart";

/** Stand-in customer, used until real auth lands. */
const DEMO_USER: AccountUser = {
  name: "Alex Mercer",
  email: "alex@example.com",
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [ready, setReady] = useState(false);

  // Read persisted state only after mount — see the hydration note above.
  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem(SESSION_KEY);
      if (storedUser) setUser(JSON.parse(storedUser) as AccountUser);
      const storedCart = window.localStorage.getItem(CART_KEY);
      if (storedCart) setCartCount(Math.max(0, Number(storedCart) || 0));
    } catch {
      // Private mode, disabled storage — a signed-out shell is a fine default.
    }
    setReady(true);
  }, []);

  const persist = useCallback((key: string, value: string | null) => {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — state still works for this session */
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

  const addToCart = useCallback(
    (quantity = 1) => {
      setCartCount((current) => {
        const next = Math.max(0, current + quantity);
        persist(CART_KEY, String(next));
        return next;
      });
    },
    [persist],
  );

  const clearCart = useCallback(() => {
    setCartCount(0);
    persist(CART_KEY, null);
  }, [persist]);

  const value = useMemo(
    () => ({ user, ready, cartCount, signIn, signOut, addToCart, clearCart }),
    [user, ready, cartCount, signIn, signOut, addToCart, clearCart],
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
