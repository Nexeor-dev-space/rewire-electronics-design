import { describe, expect, it } from "vitest";
import { checkoutInformationSchema } from "./checkout.validator";

const validData = {
  email: "customer@example.com",
  phone: "050 123 4567",
  firstName: "John",
  lastName: "Doe",
  address1: "123 Main Street",
  city: "Dubai",
  emirate: "DUBAI",
};

function fieldErrors(input: unknown) {
  const result = checkoutInformationSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("checkoutInformationSchema", () => {
  it("accepts valid checkout information", () => {
    const result = checkoutInformationSchema.parse(validData);
    expect(result.email).toBe("customer@example.com");
    expect(result.phone).toBe("+971501234567");
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.address1).toBe("123 Main Street");
    expect(result.city).toBe("Dubai");
    expect(result.emirate).toBe("DUBAI");
  });

  it("normalizes phone numbers to E.164 format", () => {
    const result = checkoutInformationSchema.parse({
      ...validData,
      phone: "+971 50 123 4567",
    });
    expect(result.phone).toBe("+971501234567");
  });

  it("trims and lowercases email addresses", () => {
    const result = checkoutInformationSchema.parse({
      ...validData,
      email: "  Customer@Example.Com  ",
    });
    expect(result.email).toBe("customer@example.com");
  });

  it("allows optional address2, postalCode and emailOptIn fields", () => {
    const result = checkoutInformationSchema.parse({
      ...validData,
      address2: "Apartment 5",
      postalCode: "12345",
      emailOptIn: true,
    });
    expect(result.address2).toBe("Apartment 5");
    expect(result.postalCode).toBe("12345");
    expect(result.emailOptIn).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(fieldErrors({ ...validData, email: "invalid" })).toHaveProperty("email");
    expect(fieldErrors({ ...validData, email: "" })).toHaveProperty("email");
  });

  it("rejects invalid phone numbers", () => {
    expect(fieldErrors({ ...validData, phone: "123" })).toHaveProperty("phone");
    expect(fieldErrors({ ...validData, phone: "" })).toHaveProperty("phone");
    expect(fieldErrors({ ...validData, phone: "1234567" })).toHaveProperty("phone");
  });

  it("rejects empty first or last name", () => {
    expect(fieldErrors({ ...validData, firstName: "" })).toHaveProperty("firstName");
    expect(fieldErrors({ ...validData, lastName: "" })).toHaveProperty("lastName");
  });

  it("rejects empty address or city", () => {
    expect(fieldErrors({ ...validData, address1: "" })).toHaveProperty("address1");
    expect(fieldErrors({ ...validData, city: "" })).toHaveProperty("city");
  });

  it("rejects invalid emirate", () => {
    expect(fieldErrors({ ...validData, emirate: "INVALID" })).toHaveProperty("emirate");
    expect(fieldErrors({ ...validData, emirate: "dubai" })).toHaveProperty("emirate");
  });

  it("accepts all seven emirates", () => {
    const emirates = ["ABU_DHABI", "AJMAN", "DUBAI", "FUJAIRAH", "RAS_AL_KHAIMAH", "SHARJAH", "UMM_AL_QUWAIN"];
    emirates.forEach((emirate) => {
      const result = checkoutInformationSchema.safeParse({
        ...validData,
        emirate,
      });
      expect(result.success).toBe(true);
    });
  });

  it("trims whitespace from name fields", () => {
    const result = checkoutInformationSchema.parse({
      ...validData,
      firstName: "  John  ",
      lastName: "  Doe  ",
      city: "  Dubai  ",
    });
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.city).toBe("Dubai");
  });
});
