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
import { WISHLIST_MAX_ITEMS } from "@/lib/constants";

/**
 * Wishlist state for the navigation and wishlist pages.
 *
 * The wishlist is a list of product slugs kept in this browser's
 * localStorage (newest first, at most `WISHLIST_MAX_ITEMS`). The wishlist
 * page turns the slugs into real product cards through
 * `GET /api/v1/wishlist`, and calls `retainSaved` to forget products that
 * no longer exist. See docs/WISHLIST.md.
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
  /** Keep only these slugs: the ones the server still knows. */
  retainSaved: (productSlugs: string[]) => void;
}

const WISHLIST_KEY = "rewire.wishlist.v1";

/**
 * Before the wishlist used real products, a first visit was seeded with
 * four demo slugs and marked with this key. A browser that still has the
 * marker drops those demo slugs once, keeping anything the shopper saved.
 */
const LEGACY_SEED_MARKER_KEY = "rewire.wishlist.seeded";
const LEGACY_SEED_SLUGS = ["iphone-15-pro-max", "macbook-air-13-m2", "airpods-max", "galaxy-s22"];

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // Read persisted state only after mount — see the hydration note above.
  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]") as unknown;
      let slugs = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
      if (window.localStorage.getItem(LEGACY_SEED_MARKER_KEY)) {
        slugs = slugs.filter((slug) => !LEGACY_SEED_SLUGS.includes(slug));
        window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(slugs));
        window.localStorage.removeItem(LEGACY_SEED_MARKER_KEY);
      }
      setWishlistSlugs(slugs.slice(0, WISHLIST_MAX_ITEMS));
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
        // Newest first; past the cap the oldest saves drop off.
        const next = current.includes(productSlug)
          ? current.filter((slug) => slug !== productSlug)
          : [productSlug, ...current].slice(0, WISHLIST_MAX_ITEMS);
        persistWishlist(next);
        return next;
      });
    },
    [persistWishlist],
  );

  const retainSaved = useCallback(
    (productSlugs: string[]) => {
      setWishlistSlugs((current) => {
        const next = current.filter((slug) => productSlugs.includes(slug));
        if (next.length === current.length) return current;
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
      retainSaved,
    }),
    [ready, wishlistSlugs, isSaved, toggleSaved, removeSaved, retainSaved],
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
