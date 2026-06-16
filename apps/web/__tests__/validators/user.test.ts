import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validators/user";

describe("registerSchema", () => {
  const valid = {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "Abcdefg1",
    confirmPassword: "Abcdefg1",
  };

  it("should accept valid registration data", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("should reject name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({ ...valid, name: "A" });
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const result = registerSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("should accept name with exactly 2 characters", () => {
    const result = registerSchema.safeParse({ ...valid, name: "Ab" });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email format", () => {
    const result = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("should reject empty email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "" });
    expect(result.success).toBe(false);
  });

  it("should reject password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "Short1",
      confirmPassword: "Short1",
    });
    expect(result.success).toBe(false);
  });

  it("should accept password with exactly 8 characters", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "Abcdefg1",
      confirmPassword: "Abcdefg1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject password without uppercase letter", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "alllowercase1",
      confirmPassword: "alllowercase1",
    });
    expect(result.success).toBe(false);
  });

  it("should reject password without a number", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "NoNumberHere",
      confirmPassword: "NoNumberHere",
    });
    expect(result.success).toBe(false);
  });

  it("should reject when passwords do not match", () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: "Different1",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("should accept valid login data", () => {
    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email format", () => {
    const result = loginSchema.safeParse({ email: "bad", password: "test" });
    expect(result.success).toBe(false);
  });

  it("should reject empty password", () => {
    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("should accept any non-empty password (no strength validation)", () => {
    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });
});
