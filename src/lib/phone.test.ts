import { describe, expect, it } from "vitest";
import {
  composePhone,
  OTHER_COUNTRY_MESSAGE,
  parsePhone,
  phoneSearchTerms,
  SAUDI_PHONE,
  splitPhone,
  UAE_PHONE,
} from "./phone";

const UAE_PROBLEM = UAE_PHONE.invalidMessage;
const SAUDI_PROBLEM = SAUDI_PHONE.invalidMessage;

describe("splitPhone", () => {
  it("reads a stored UAE number", () => {
    expect(splitPhone("+971501234567")).toEqual({ country: UAE_PHONE, number: "501234567" });
  });

  it("reads a stored Saudi number", () => {
    expect(splitPhone("+966501234567")).toEqual({ country: SAUDI_PHONE, number: "501234567" });
  });

  it("switches country when a number is pasted with the other code", () => {
    expect(splitPhone("00966 50 123 4567", UAE_PHONE)).toEqual({ country: SAUDI_PHONE, number: "501234567" });
  });

  it("reads a country code typed without the plus", () => {
    expect(splitPhone("971501234567")).toEqual({ country: UAE_PHONE, number: "501234567" });
  });

  it("removes a doubled country code", () => {
    expect(splitPhone("+971 +971 50 123 4567").number).toBe("501234567");
    expect(splitPhone("+971 971 50 123 4567").number).toBe("501234567");
  });

  it("keeps the typed text and the chosen country when there is no code", () => {
    expect(splitPhone("050 123", SAUDI_PHONE)).toEqual({ country: SAUDI_PHONE, number: "050 123" });
  });

  it("does not read a Fujairah landline as a country code", () => {
    expect(splitPhone("97123456")).toEqual({ country: UAE_PHONE, number: "97123456" });
  });

  it("starts empty on the UAE", () => {
    expect(splitPhone("")).toEqual({ country: UAE_PHONE, number: "" });
  });
});

describe("composePhone", () => {
  it("joins the country code and number without separators", () => {
    expect(composePhone(UAE_PHONE, "50 123 4567")).toBe("+971501234567");
  });

  it("drops the leading zero of a local number", () => {
    expect(composePhone(SAUDI_PHONE, "050 123 4567")).toBe("+966501234567");
  });

  it("is empty until there are digits to send", () => {
    expect(composePhone(UAE_PHONE, "")).toBe("");
    expect(composePhone(UAE_PHONE, "0")).toBe("");
  });
});

describe("parsePhone", () => {
  it("accepts a 9 digit UAE mobile", () => {
    expect(parsePhone("+971501234567")).toEqual({ e164: "+971501234567", problem: null });
  });

  it("accepts an 8 digit UAE landline", () => {
    expect(parsePhone("+97141234567")).toEqual({ e164: "+97141234567", problem: null });
  });

  it("accepts a Saudi mobile", () => {
    expect(parsePhone("+966 50 123 4567")).toEqual({ e164: "+966501234567", problem: null });
  });

  it("treats a local number as UAE", () => {
    expect(parsePhone("050 123 4567").e164).toBe("+971501234567");
  });

  it("refuses an incomplete UAE mobile", () => {
    expect(parsePhone("+97150123456").problem).toBe(UAE_PROBLEM);
  });

  it("refuses an incomplete Saudi mobile with the Saudi message", () => {
    expect(parsePhone("+96650123456").problem).toBe(SAUDI_PROBLEM);
  });

  it("refuses a Saudi number that is not a mobile", () => {
    expect(parsePhone("+966112345678").problem).toBe(SAUDI_PROBLEM);
  });

  it("applies the rule of the country code it was given", () => {
    expect(parsePhone("+97141234567").problem).toBeNull();
    expect(parsePhone("+96641234567").problem).toBe(SAUDI_PROBLEM);
  });

  it("refuses a doubled country code", () => {
    expect(parsePhone("+971+971501234567").problem).toBe(UAE_PROBLEM);
    expect(parsePhone("+971971501234567").problem).toBe(UAE_PROBLEM);
  });

  it("refuses a number with no country code or leading zero", () => {
    expect(parsePhone("501234567").problem).toBe(UAE_PROBLEM);
  });

  it("says when a number is from another country", () => {
    expect(parsePhone("+44 7911 123456")).toEqual({ e164: null, problem: OTHER_COUNTRY_MESSAGE });
    expect(parsePhone("0044 7911 123456")).toEqual({ e164: null, problem: OTHER_COUNTRY_MESSAGE });
  });

  it("says so when another country's number is typed into the box", () => {
    for (const typed of ["+44 7911 123456", "0044 7911 123456"]) {
      const { country, number } = splitPhone(typed, UAE_PHONE);
      expect(parsePhone(composePhone(country, number)).problem).toBe(OTHER_COUNTRY_MESSAGE);
    }
  });
});

describe("phoneSearchTerms", () => {
  it("looks for a local number under both countries", () => {
    expect(phoneSearchTerms("0501234567")).toEqual(["+971501234567", "+966501234567"]);
    expect(phoneSearchTerms("050 123 4567")).toEqual(["+971501234567", "+966501234567"]);
  });

  it("looks for a number with a country code under that country only", () => {
    expect(phoneSearchTerms("+971 50 123 4567")).toEqual(["+971501234567"]);
    expect(phoneSearchTerms("00966501234567")).toEqual(["+966501234567"]);
  });

  it("finds the start of a local number", () => {
    expect(phoneSearchTerms("050 123")).toEqual(["+97150123", "+96650123"]);
  });

  it("adds nothing for a search that is not a number", () => {
    expect(phoneSearchTerms("john")).toEqual([]);
    expect(phoneSearchTerms("john 050")).toEqual([]);
  });

  it("adds nothing that would match every number", () => {
    expect(phoneSearchTerms("0")).toEqual([]);
    expect(phoneSearchTerms("+971")).toEqual([]);
  });
});
