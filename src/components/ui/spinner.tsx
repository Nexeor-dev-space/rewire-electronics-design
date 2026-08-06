import { cn } from "@/lib/utils";

/** Minimal circular spinner — inherits currentColor. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
