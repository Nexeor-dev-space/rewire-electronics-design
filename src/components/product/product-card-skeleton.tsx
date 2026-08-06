import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout-accurate ghost of ProductCard — identical aspect ratio and
 * meta spacing so hydrated content causes zero layout shift.
 */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-4/5 rounded-xl" />
      <div className="mt-5 flex items-start justify-between gap-4 px-1">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
