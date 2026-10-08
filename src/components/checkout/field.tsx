import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";

/**
 * Field — label + input in one place. The label is the mono eyebrow the
 * rest of the site uses; the hint below is optional and set in muted
 * body type. `span` controls the responsive column span inside the form
 * grid — 6 out of 6 for full-width, 3 for a two-up row on desktop.
 */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** How many columns of the 6-col form grid this field spans on sm+. */
  span?: 2 | 3 | 4 | 6;
  trailing?: ReactNode;
}

const SPAN_CLASS: Record<NonNullable<FieldProps["span"]>, string> = {
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  6: "sm:col-span-6",
};

export function Field({
  id,
  label,
  hint,
  error,
  span = 6,
  className,
  trailing,
  ...inputProps
}: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("col-span-6", SPAN_CLASS[span], className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {trailing && (
          <span className="text-[0.75rem] text-ink-muted">{trailing}</span>
        )}
      </div>
      <Input
        id={id}
        name={id}
        className="mt-2"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {error ? (
        <FieldError id={errorId} className="mt-1.5 text-[0.75rem]">
          {error}
        </FieldError>
      ) : (
        hint && (
          <p id={hintId} className="mt-1.5 text-[0.75rem] text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
