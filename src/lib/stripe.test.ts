import { describe, expect, it, vi } from "vitest";
import { describeStripe } from "./stripe";

vi.mock("server-only", () => ({}));

const FAKE_KEY_BODY = "0".repeat(24);
const fakeKey = (prefix: string) => `${prefix}${FAKE_KEY_BODY}`;

const TEST_KEY = fakeKey("sk_test_");
const LIVE_KEY = fakeKey("sk_live_");
const RESTRICTED_LIVE_KEY = fakeKey("rk_live_");
const RESTRICTED_TEST_KEY = fakeKey("rk_test_");
const WEBHOOK_SECRET = fakeKey("whsec_");

function expectNoSecret(problem: string | null, secrets: string[]) {
  for (const secret of secrets) {
    expect(problem ?? "").not.toContain(secret);
    expect(problem ?? "").not.toContain(secret.slice(-8));
  }
}

describe("describeStripe", () => {
  it("reports an unset key", () => {
    expect(describeStripe({})).toEqual({
      configured: false,
      mode: null,
      webhookConfigured: false,
      problem: "STRIPE_SECRET_KEY is not set.",
    });
    expect(describeStripe({ STRIPE_SECRET_KEY: "   " }).problem).toBe("STRIPE_SECRET_KEY is not set.");
  });

  it("reads test mode from a test key", () => {
    expect(describeStripe({ STRIPE_SECRET_KEY: TEST_KEY })).toEqual({
      configured: true,
      mode: "test",
      webhookConfigured: false,
      problem: null,
    });
  });

  it("reads live mode from a live key", () => {
    expect(describeStripe({ STRIPE_SECRET_KEY: LIVE_KEY })).toMatchObject({ configured: true, mode: "live" });
  });

  it("accepts restricted keys", () => {
    expect(describeStripe({ STRIPE_SECRET_KEY: RESTRICTED_LIVE_KEY })).toMatchObject({ configured: true, mode: "live" });
    expect(describeStripe({ STRIPE_SECRET_KEY: RESTRICTED_TEST_KEY })).toMatchObject({ configured: true, mode: "test" });
  });

  it("reports an invalid key without echoing it", () => {
    const secrets = [fakeKey("pk_live_"), fakeKey("sk_"), FAKE_KEY_BODY];
    for (const secret of secrets) {
      const description = describeStripe({ STRIPE_SECRET_KEY: secret });
      expect(description).toMatchObject({
        configured: false,
        mode: null,
        problem: "STRIPE_SECRET_KEY is set but invalid.",
      });
      expectNoSecret(description.problem, [secret]);
    }
  });

  it("reports the webhook secret when set", () => {
    expect(describeStripe({ STRIPE_SECRET_KEY: TEST_KEY, STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET })).toEqual({
      configured: true,
      mode: "test",
      webhookConfigured: true,
      problem: null,
    });
  });

  it("treats an unset webhook secret as not configured, without a problem", () => {
    expect(describeStripe({ STRIPE_SECRET_KEY: LIVE_KEY, STRIPE_WEBHOOK_SECRET: "" })).toMatchObject({
      webhookConfigured: false,
      problem: null,
    });
  });

  it("reports an invalid webhook secret without echoing it", () => {
    const secret = "wh_9ZyXwVuTsRqPoNmLkJiH";
    const description = describeStripe({ STRIPE_SECRET_KEY: LIVE_KEY, STRIPE_WEBHOOK_SECRET: secret });
    expect(description).toMatchObject({
      configured: true,
      webhookConfigured: false,
      problem: "STRIPE_WEBHOOK_SECRET is set but invalid.",
    });
    expectNoSecret(description.problem, [secret, LIVE_KEY]);
  });

  it("lists both problems when both values are invalid", () => {
    const description = describeStripe({ STRIPE_SECRET_KEY: "pk_test_abc123", STRIPE_WEBHOOK_SECRET: "nope_abc123" });
    expect(description.problem).toBe("STRIPE_SECRET_KEY is set but invalid. STRIPE_WEBHOOK_SECRET is set but invalid.");
    expectNoSecret(description.problem, ["pk_test_abc123", "nope_abc123"]);
  });

  it("never puts a valid secret in any message", () => {
    for (const env of [
      { STRIPE_SECRET_KEY: TEST_KEY },
      { STRIPE_SECRET_KEY: LIVE_KEY, STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET },
      { STRIPE_SECRET_KEY: "pk_live_x", STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET },
    ]) {
      expectNoSecret(describeStripe(env).problem, Object.values(env));
    }
  });
});
