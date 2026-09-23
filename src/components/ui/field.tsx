import type { ReactNode } from "react";
import { FieldError, Label } from "./label";
import { cn } from "@/lib/utils";

/**
 * Label, control, hint and error in the house arrangement. Every admin form
 * field is wrapped in one, so the spacing and the error placement cannot
 * drift between modals.
 */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
