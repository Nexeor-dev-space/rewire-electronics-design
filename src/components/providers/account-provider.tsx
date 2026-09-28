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
 * Wishlist state for the navigation and wishlist pages.
 *
 * ⚠ This is a front-end stand-in for the wishlist, not a real saved-items
 * store. It persists to localStorage so the wishlist pages are reviewable
 * today; every field and method below is shaped to be replaced by the
 * real wishlist adapter without touching a single component.
 *
 * Session state (`user`, `signIn`, `signOut`) used to live here too, as a
 * demo stand-in; it is now real — see `useGetMe`/`useSignIn`/`useSignOut`
 * in `src/hooks/use-auth.ts`. The cart moved to the real cart API and
 * `src/hooks/use-cart.ts` in Phase 4 — see `docs/CART.md`. This provider
 * still owns the wishlist, which moves to its own adapter in Phase 3.
 *
 * Hydration: the server and first client render are always signed out
 * with an empty wishlist. Persisted state is read *after* mount, so
 * markup never differs between server and client. `ready` tells the UI
 * when that read has happened, which is what stops the wishlist badge
 * flashing in on every page load.
 */

interface AccountContextValue {
  /** False until persisted state has been read on the client. */
  ready: boolean;
  /** Saved product slugs, ordered newest first. */
  wishlistSlugs: string[];
  isSaved: (productSlug: string) => boolean;
  toggleSaved: (productSlug: string) => void;
  removeSaved: (productSlug: string) => void;
}

const WISHLIST_KEY = "rewire.wishlist.v1";
/** Same idea for the wishlist — one seed per browser, then hands off. */
const WISHLIST_SEED_MARKER_KEY = "rewire.wishlist.seeded";

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // Read persisted state only after mount — see the hydration note above.
  useEffect(() => {
    try {
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

  const value = useMemo(
    () => ({
      ready,
      wishlistSlugs,
      isSaved,
      toggleSaved,
      removeSaved,
    }),
    [ready, wishlistSlugs, isSaved, toggleSaved, removeSaved],
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
