/**
 * CartSkeleton — the shell shown for the single frame before the
 * account provider has read persisted cart state. Same layout as the
 * populated view so nothing shifts when the real content arrives.
 */
export function CartSkeleton() {
  return (
    <div
      aria-hidden
      className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16"
    >
      <div className="lg:col-span-7 xl:col-span-8">
        <div className="border-t border-line">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex gap-6 border-b border-line py-8 sm:gap-8"
            >
              <div className="skeleton size-32 shrink-0 rounded-xl md:size-36" />
              <div className="flex-1 space-y-3">
                <div className="skeleton h-3 w-16 rounded" />
                <div className="skeleton h-5 w-3/5 rounded" />
                <div className="skeleton h-3 w-2/5 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="skeleton h-[26rem] rounded-2xl" />
      </div>
    </div>
  );
}
