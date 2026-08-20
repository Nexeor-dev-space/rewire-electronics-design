"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * OptionList — the radio pattern used for Delivery Method and Payment
 * Method. Each option is a card-sized row with a header (label + trailing
 * price or badge) and an optional supporting line. The whole row is the
 * click target; the visible radio marker is a token, not the input.
 *
 * `value` and `onChange` make it controlled; the caller decides the
 * default so the summary can react instantly.
 */
export interface OptionListItem {
  value: string;
  label: string;
  supporting?: string;
  trailing?: ReactNode;
  disabled?: boolean;
}

interface Props {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionListItem[];
}

export function OptionList({ name, value, onChange, options }: Props) {
  const uid = useId();
  return (
    <ul className="grid gap-3">
      {options.map((option) => {
        const id = `${uid}-${option.value}`;
        const selected = option.value === value;
        return (
          <li key={option.value}>
            <label
              htmlFor={id}
              className={cn(
                "group relative flex cursor-pointer items-start gap-4 rounded-xl border bg-surface p-4 sm:p-5",
                "transition-[border-color,background-color] duration-(--duration-fast) ease-(--ease-out-quart)",
                selected
                  ? "border-ink bg-surface-2"
                  : "border-line hover:border-line-strong",
                option.disabled && "cursor-not-allowed opacity-45",
              )}
            >
              <input
                type="radio"
                id={id}
                name={name}
                value={option.value}
                checked={selected}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-ink" : "border-line-strong",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full bg-ink transition-opacity duration-(--duration-fast)",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                />
              </span>

              <span className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-medium text-ink">
                    {option.label}
                  </span>
                  {option.supporting && (
                    <span className="mt-1 block text-[0.8125rem] text-ink-secondary">
                      {option.supporting}
                    </span>
                  )}
                </span>
                {option.trailing && (
                  <span className="shrink-0 font-mono text-[0.8125rem] tabular-nums text-ink">
                    {option.trailing}
                  </span>
                )}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
