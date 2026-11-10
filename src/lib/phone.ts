export interface PhoneCountry {
  dialCode: string;
  shortName: string;
  example: string;
  nationalNumber: RegExp;
  invalidMessage: string;
}

export interface PhoneParts {
  country: PhoneCountry;
  number: string;
}

export type ParsedPhone = { e164: string; problem: null } | { e164: null; problem: string };

export const UAE_PHONE: PhoneCountry = {
  dialCode: "+971",
  shortName: "UAE",
  example: "50 123 4567",
  nationalNumber: /^(5[024568]|[234679])\d{7}$/,
  invalidMessage: "Enter a valid UAE phone number, e.g. 050 123 4567.",
};

export const SAUDI_PHONE: PhoneCountry = {
  dialCode: "+966",
  shortName: "KSA",
  example: "50 123 4567",
  nationalNumber: /^5\d{8}$/,
  invalidMessage: "Enter a valid Saudi phone number, e.g. 050 123 4567.",
};

export const PHONE_COUNTRIES: readonly PhoneCountry[] = [UAE_PHONE, SAUDI_PHONE];

export const OTHER_COUNTRY_MESSAGE = "Only UAE (+971) and Saudi (+966) numbers are accepted.";

const INTERNATIONAL_PREFIX = /^(\+|00)/;
const SEPARATORS = /[\s\-.()]/g;
const SHORTEST_NATIONAL_DIGITS = 8;
const LOCAL_PREFIX = "0";
const PHONE_SEARCH_TERM = /^\+?\d+$/;

const compact = (value: string) => value.replace(SEPARATORS, "");

function leadingCountryCode(value: string): { country: PhoneCountry; rest: string } | null {
  for (const country of PHONE_COUNTRIES) {
    const code = country.dialCode.slice(1);
    const prefix = [country.dialCode, `00${code}`].find((candidate) => value.startsWith(candidate));
    if (prefix) return { country, rest: value.slice(prefix.length) };
    if (value.startsWith(code) && value.length - code.length >= SHORTEST_NATIONAL_DIGITS) {
      return { country, rest: value.slice(code.length) };
    }
  }
  return null;
}

export function splitPhone(value: string, current: PhoneCountry = UAE_PHONE): PhoneParts {
  let parts: PhoneParts = { country: current, number: value };
  let found = leadingCountryCode(compact(value));
  while (found) {
    parts = { country: found.country, number: found.rest };
    found = leadingCountryCode(found.rest);
  }
  return parts;
}

export function composePhone(country: PhoneCountry, number: string): string {
  const digits = compact(number);
  if (INTERNATIONAL_PREFIX.test(digits)) return digits;
  const national = digits.startsWith(LOCAL_PREFIX) ? digits.slice(LOCAL_PREFIX.length) : digits;
  return national ? `${country.dialCode}${national}` : "";
}

export function parsePhone(value: string): ParsedPhone {
  const digits = compact(value);
  const found = leadingCountryCode(digits);
  if (!found && INTERNATIONAL_PREFIX.test(digits)) return { e164: null, problem: OTHER_COUNTRY_MESSAGE };
  const country = found?.country ?? UAE_PHONE;
  const national = found ? found.rest : digits.startsWith(LOCAL_PREFIX) ? digits.slice(LOCAL_PREFIX.length) : null;
  return national !== null && country.nationalNumber.test(national)
    ? { e164: `${country.dialCode}${national}`, problem: null }
    : { e164: null, problem: country.invalidMessage };
}

export function phoneSearchTerms(value: string): string[] {
  if (!PHONE_SEARCH_TERM.test(compact(value))) return [];
  const terms = PHONE_COUNTRIES.map((country) => {
    const parts = splitPhone(value, country);
    return composePhone(parts.country, parts.number);
  });
  return [...new Set(terms)].filter(Boolean);
}
