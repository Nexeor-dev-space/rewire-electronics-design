import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Inputs — quiet, hairline fields on dark surfaces.
 * The border brightens on hover and turns accent on focus.
 * Invalid state is driven by aria-invalid for accessibility-first styling.
 */
const fieldStyles = [
  "w-full rounded-md bg-surface text-ink placeholder:text-ink-muted",
  "border border-line px-4 text-sm",
  "transition-[border-color,background-color] duration-(--duration-fast) ease-(--ease-out-quart)",
  "hover:border-line-strong",
  "focus:border-accent focus:outline-none",
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

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Native select in the field style — the platform picker on touch, keyboard for free. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldStyles, "h-12 appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-4 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
        aria-hidden
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>
  ),
);
Select.displayName = "Select";
