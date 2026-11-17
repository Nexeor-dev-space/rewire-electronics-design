import { describe, expect, it } from "vitest";
import { INTEGRATION_VALUE_MAX_LENGTH } from "@/lib/constants";
import type { IdIntegrationKey } from "@/types/integration";
import { idIntegrationParamsSchema, integrationParamsSchema, integrationValueSchemas } from "./integration.validator";

function parse(key: IdIntegrationKey, value: unknown) {
  return integrationValueSchemas[key].safeParse({ value });
}

function saved(key: IdIntegrationKey, value: string) {
  const result = parse(key, value);
  return result.success ? result.data.value : null;
}

function message(key: IdIntegrationKey, value: string) {
  const result = parse(key, value);
  return result.success ? null : result.error.issues[0]?.message;
}

const CASES: Record<IdIntegrationKey, { accepted: string[]; refused: string[]; normalised: [string, string][] }> = {
  GA4: {
    accepted: ["G-AB12CD34EF", "G-123456", "G-ABCDEFGHIJKLMNOP"],
    refused: ["UA-12345-1", "G-ABC12", "AB12CD34EF", "G-AB12-CD34", 'G-AB12CD34EF"</script>'],
    normalised: [["  g-ab12cd34ef  ", "G-AB12CD34EF"]],
  },
  CLARITY: {
    accepted: ["k3x9p2m7qa", "abc123", "a1b2c3d4e5f6g7h8i9j0"],
    refused: ["abc12", "abcd-1234", "a1b2c3d4e5f6g7h8i9j0k", "abcd1234ef'"],
    normalised: [[" K3X9P2M7QA ", "k3x9p2m7qa"]],
  },
  SEARCH_CONSOLE: {
    accepted: ["Xc8nP2qL7vR4tY9wK1mB6sD3fG0hJ5aZ_eU-iO2xN7c", "abcdefghij0123456789"],
    refused: [
      "abcdefghij012345678",
      '<meta name="google-site-verification" content="Xc8nP2qL7vR4tY9wK1mB6sD3fG0hJ5aZ_eU-iO2xN7c" />',
      "Xc8nP2qL7vR4tY9wK1mB6sD3fG0hJ5aZ eU-iO2xN7c",
    ],
    normalised: [[" Xc8nP2qL7vR4tY9wK1mB6sD3fG0hJ5aZ_eU-iO2xN7c ", "Xc8nP2qL7vR4tY9wK1mB6sD3fG0hJ5aZ_eU-iO2xN7c"]],
  },
  META_PIXEL: {
    accepted: ["804215376190482", "8042153761904821"],
    refused: ["80421537619048", "80421537619048213", "80421537619048a", "804215376190482;"],
    normalised: [[" 804215376190482 ", "804215376190482"]],
  },
};

describe("integrationValueSchemas", () => {
  for (const [key, { accepted, refused, normalised }] of Object.entries(CASES) as [IdIntegrationKey, (typeof CASES)[IdIntegrationKey]][]) {
    describe(key, () => {
      it("accepts valid values", () => {
        for (const value of accepted) expect(saved(key, value)).toBe(value);
      });

      it("refuses invalid values with the expected format", () => {
        for (const value of refused) expect(message(key, value)).toMatch(/^Expected format: .+, for example .+\.$/);
      });

      it("allows empty, which turns it off", () => {
        expect(saved(key, "")).toBe("");
        expect(saved(key, "   ")).toBe("");
      });

      it("trims and normalises the case", () => {
        for (const [raw, expected] of normalised) expect(saved(key, raw)).toBe(expected);
      });

      it("refuses a missing or overlong value", () => {
        expect(integrationValueSchemas[key].safeParse({}).success).toBe(false);
        expect(parse(key, 123).success).toBe(false);
        expect(message(key, "a".repeat(INTEGRATION_VALUE_MAX_LENGTH + 1))).toBe(
          `Keep it under ${INTEGRATION_VALUE_MAX_LENGTH} characters.`,
        );
      });
    });
  }

  it("shows the GA4 hint and example in its message", () => {
    expect(message("GA4", "UA-1")).toBe("Expected format: G-XXXXXXXXXX, for example G-AB12CD34EF.");
  });

  it("does not uppercase Search Console tokens", () => {
    expect(saved("SEARCH_CONSOLE", "abcdefghijABCDEFGHIJ")).toBe("abcdefghijABCDEFGHIJ");
  });
});

describe("integration params", () => {
  it("accepts every integration key for tests", () => {
    for (const key of ["GA4", "CLARITY", "SEARCH_CONSOLE", "META_PIXEL", "EMAIL", "STRIPE"]) {
      expect(integrationParamsSchema.safeParse({ key }).success).toBe(true);
    }
    expect(integrationParamsSchema.safeParse({ key: "PAYPAL" }).success).toBe(false);
  });

  it("accepts only the ID keys for saving", () => {
    expect(idIntegrationParamsSchema.safeParse({ key: "GA4" }).success).toBe(true);
    expect(idIntegrationParamsSchema.safeParse({ key: "EMAIL" }).success).toBe(false);
    expect(idIntegrationParamsSchema.safeParse({ key: "STRIPE" }).success).toBe(false);
    expect(idIntegrationParamsSchema.safeParse({ key: "ga4" }).success).toBe(false);
  });
});
