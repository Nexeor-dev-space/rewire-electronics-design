/**
 * WishlistSkeleton — the shell shown for the single frame before the
 * account provider has read persisted wishlist slugs. Same 4-column grid
 * as the populated state, so nothing shifts when the real content arrives.
 */
export function WishlistSkeleton() {
  return (
    <div
      aria-hidden
      className="mt-14 grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="skeleton aspect-square rounded-xl" />
          <div className="space-y-3 pt-2">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
          </div>
          <div className="skeleton mt-2 h-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}
