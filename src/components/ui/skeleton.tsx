import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton — shimmer placeholder matching the dark surface palette.
 * Compose into layout-accurate ghosts (see ProductCardSkeleton) so
 * content loads without layout shift.
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("skeleton rounded-md", className)}
      {...props}
    />
  );
}
