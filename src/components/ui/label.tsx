import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Form label in the technical mono voice. Always pair with htmlFor. */
export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("eyebrow block cursor-pointer", className)}
      {...props}
    />
  );
}

/** Inline field-level error message, linked via aria-describedby. */
export function FieldError({
  id,
  children,
  className,
}: {
  id?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className={cn("text-sm text-danger", className)}>
      {children}
    </p>
  );
}
