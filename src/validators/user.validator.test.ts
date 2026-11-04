import { describe, expect, it } from "vitest";
import { myAddressesSchema } from "./user.validator";

const address = { emirate: "DUBAI", street: "Marina Gate 2", landmark: "Dubai Marina Mall", isPrimary: false };

describe("myAddressesSchema", () => {
  it("accepts an empty list, which removes every address", () => {
    expect(myAddressesSchema.safeParse({ addresses: [] }).success).toBe(true);
  });

  it("accepts new and existing addresses and trims the text", () => {
    const parsed = myAddressesSchema.parse({
      addresses: [{ ...address, street: "  Marina Gate 2 " }, { ...address, id: "addr1", isPrimary: true }],
    });
    expect(parsed.addresses[0].street).toBe("Marina Gate 2");
    expect(parsed.addresses[1].id).toBe("addr1");
  });

  it("rejects a blank street or landmark and an unknown emirate", () => {
    expect(myAddressesSchema.safeParse({ addresses: [{ ...address, street: " " }] }).success).toBe(false);
    expect(myAddressesSchema.safeParse({ addresses: [{ ...address, landmark: "" }] }).success).toBe(false);
    expect(myAddressesSchema.safeParse({ addresses: [{ ...address, emirate: "MARS" }] }).success).toBe(false);
  });

  it("rejects two primaries and more than ten addresses", () => {
    const primary = { ...address, isPrimary: true };
    expect(myAddressesSchema.safeParse({ addresses: [primary, primary] }).success).toBe(false);
    expect(myAddressesSchema.safeParse({ addresses: Array(11).fill(address) }).success).toBe(false);
  });
});
