"use client";

import { useState } from "react";
import { composePhone, parsePhone, PHONE_COUNTRIES, splitPhone, type PhoneParts } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Field } from "./field";
import { Input, Select } from "./input";

export function PhoneField({
  id,
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required,
  className,
  controlClassName,
}: {
  id: string;
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  controlClassName?: string;
}) {
  const [draft, setDraft] = useState<PhoneParts>(() => splitPhone(value));
  const [checking, setChecking] = useState(value !== "");

  const parts = composePhone(draft.country, draft.number) === value ? draft : splitPhone(value);
  const message = (checking && value ? parsePhone(value).problem : error) ?? undefined;

  function update(next: PhoneParts) {
    setDraft(next);
    onChange(composePhone(next.country, next.number));
  }

  function changeCountry(dialCode: string) {
    setChecking(true);
    const country = PHONE_COUNTRIES.find((option) => option.dialCode === dialCode) ?? parts.country;
    update({ country, number: parts.number });
  }

  return (
    <Field id={id} label={label} error={message} hint={message ? undefined : hint} className={className}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="flex gap-2">
        <Select
          aria-label="Country code"
          value={parts.country.dialCode}
          onChange={(event) => changeCountry(event.target.value)}
          className={cn("w-28 pl-3 pr-8", controlClassName)}
        >
          {PHONE_COUNTRIES.map((country) => (
            <option key={country.dialCode} value={country.dialCode}>
              {country.dialCode} {country.shortName}
            </option>
          ))}
        </Select>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          placeholder={parts.country.example}
          value={parts.number}
          onChange={(event) => update(splitPhone(event.target.value, parts.country))}
          onBlur={() => {
            setChecking(true);
            onBlur?.();
          }}
          aria-invalid={message ? true : undefined}
          className={cn("min-w-0 flex-1 px-3", controlClassName)}
        />
      </div>
    </Field>
  );
}
