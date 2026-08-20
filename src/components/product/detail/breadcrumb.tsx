import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Editorial breadcrumb — hairline separator dots, mono voice.
 * Last crumb is the page title, unlinked and inked.
 */
export function Breadcrumb({
  trail,
  className,
}: {
  trail: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-ink-secondary", className)}>
      <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.75rem] uppercase tracking-[0.16em]">
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-2.5">
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-ink"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={cn(isLast && "text-ink")}>{crumb.label}</span>
              )}
              {!isLast && (
                <span aria-hidden className="text-ink-faint">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
