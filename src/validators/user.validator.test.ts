import { describe, expect, it } from "vitest";
import { myAddressesSchema, myProfileSchema } from "./user.validator";

describe("myProfileSchema", () => {
  it("trims the name and stores the phone in its full form", () => {
    expect(myProfileSchema.parse({ fullName: "  Sara Ali ", phone: "050 123 4567" })).toEqual({
      fullName: "Sara Ali",
      phone: "+971501234567",
    });
  });

  it("accepts a Saudi number", () => {
    expect(myProfileSchema.parse({ fullName: "Sara", phone: "+966501234567" }).phone).toBe("+966501234567");
  });

  it("turns a blank phone into null, which removes it", () => {
    expect(myProfileSchema.parse({ fullName: "Sara", phone: "" }).phone).toBeNull();
  });

  it("rejects a blank name", () => {
    expect(myProfileSchema.safeParse({ fullName: "  ", phone: "" }).success).toBe(false);
  });

  it("rejects a number from another country", () => {
    expect(myProfileSchema.safeParse({ fullName: "Sara", phone: "+447700900123" }).success).toBe(false);
  });
});

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
