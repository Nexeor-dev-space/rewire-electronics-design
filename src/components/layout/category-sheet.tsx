"use client";

import Image from "next/image";
import Link from "next/link";
import { Dialog, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { useStorefrontCategories } from "@/components/providers/storefront-categories-provider";
import { productHrefForCategory, SHOP_INDEX_HREF } from "@/lib/route-map";
import { cn } from "@/lib/utils";

/**
 * CategorySheet — the bottom bar's Categories tab.
 *
 * A sheet from the bottom edge on phones (a centred panel from `sm`, the
 * shared `Dialog` behaviour) listing every published top-level category
 * that is shown in navigation. The list is the one `SiteLayout` already
 * loads for the header, so opening the sheet costs no request.
 *
 * Each row goes straight to that category's listing; the pinned button at
 * the foot goes to the full shop. Following a link closes the sheet.
 */
export function CategorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useStorefrontCategories();

  return (
    <Dialog open={open} onClose={onClose} title="Categories">
      <DialogBody className="px-3 py-2">
        {categories.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-ink-secondary">
            No categories to show yet.
          </p>
        ) : (
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={productHrefForCategory(category.slug)}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-3 py-3",
                    "transition-colors duration-(--duration-fast) hover:bg-ink/5",
                  )}
                >
                  <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-ink-muted">
                    {category.imageUrl ? (
                      <Image src={category.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <GridIcon className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium uppercase tracking-[0.08em] text-ink">
                    {category.name}
                  </span>
                  <ChevronIcon className="size-4 shrink-0 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogBody>

      <DialogFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Link
          href={SHOP_INDEX_HREF}
          onClick={onClose}
          className={cn(
            "flex h-12 w-full items-center justify-center rounded-full",
            "bg-ink text-sm font-medium tracking-tight text-surface",
            "transition-colors duration-(--duration-fast) hover:bg-ink-hover",
          )}
        >
          View all products
        </Link>
      </DialogFooter>
    </Dialog>
  );
}

export function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}
