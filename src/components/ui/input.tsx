import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Inputs — quiet, hairline fields on dark surfaces.
 * The border brightens on hover and turns copper on focus.
 * Invalid state is driven by aria-invalid for accessibility-first styling.
 */
const fieldStyles = [
  "w-full rounded-md bg-surface text-ink placeholder:text-ink-muted",
  "border border-line px-4 text-sm",
  "transition-[border-color,background-color] duration-(--duration-fast) ease-(--ease-out-quart)",
  "hover:border-line-strong",
  "focus:border-copper focus:outline-none",
  "aria-invalid:border-danger",
  "disabled:pointer-events-none disabled:opacity-40",
];

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldStyles, "h-12", className)} {...props} />
  ),
);
Input.displayName = "Input";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldStyles, "min-h-32 py-3.5 resize-y", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
