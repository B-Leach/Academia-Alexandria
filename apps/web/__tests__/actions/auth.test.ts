import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import { mockSignIn } from "../helpers/mock-auth";
import { buildFormData } from "../helpers/form-data";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashedpassword"),
  },
}));

vi.mock("next-auth", () => {
  class AuthError extends Error {
    type: string;
    constructor(type: string) {
      super(type);
      this.type = type;
      this.name = "AuthError";
    }
  }
  return { AuthError };
});

import { register, login } from "@/actions/auth";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

beforeEach(() => {
  mockSignIn.mockReset();
});

// -----------------------------------------------------------------------
// register
// -----------------------------------------------------------------------
describe("register", () => {
  const validForm = () =>
    buildFormData({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "Abcdefg1",
      confirmPassword: "Abcdefg1",
    });

  it("should register a new user with valid data", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({} as any);
    mockSignIn.mockResolvedValue(undefined);

    const result = await register(validForm());
    expect(result.success).toBe(true);
  });

  it("should return error for invalid email", async () => {
    const fd = buildFormData({
      name: "Jane",
      email: "not-email",
      password: "Abcdefg1",
      confirmPassword: "Abcdefg1",
    });
    const result = await register(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error for password without uppercase", async () => {
    const fd = buildFormData({
      name: "Jane",
      email: "jane@example.com",
      password: "alllower1",
      confirmPassword: "alllower1",
    });
    const result = await register(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error for password without number", async () => {
    const fd = buildFormData({
      name: "Jane",
      email: "jane@example.com",
      password: "NoNumbers",
      confirmPassword: "NoNumbers",
    });
    const result = await register(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error for mismatched passwords", async () => {
    const fd = buildFormData({
      name: "Jane",
      email: "jane@example.com",
      password: "Abcdefg1",
      confirmPassword: "Different1",
    });
    const result = await register(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error for short password", async () => {
    const fd = buildFormData({
      name: "Jane",
      email: "jane@example.com",
      password: "Short1",
      confirmPassword: "Short1",
    });
    const result = await register(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error when email already exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" } as any);
    const result = await register(validForm());
    expect(result.error).toContain("already exists");
  });

  it("should hash the password before storing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({} as any);
    mockSignIn.mockResolvedValue(undefined);

    await register(validForm());
    expect(bcrypt.hash).toHaveBeenCalledWith("Abcdefg1", 12);
  });

  it("should call signIn after successful creation", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({} as any);
    mockSignIn.mockResolvedValue(undefined);

    await register(validForm());
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "jane@example.com",
      password: "Abcdefg1",
      redirectTo: "/dashboard",
    });
  });

  it("should return error when signIn throws AuthError", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({} as any);
    mockSignIn.mockRejectedValue(new AuthError("CredentialsSignin"));

    const result = await register(validForm());
    expect(result.error).toContain("Failed to sign in");
  });
});

// -----------------------------------------------------------------------
// login
// -----------------------------------------------------------------------
describe("login", () => {
  it("should call signIn with credentials", async () => {
    mockSignIn.mockResolvedValue(undefined);
    const fd = buildFormData({ email: "jane@example.com", password: "Abcdefg1" });
    const result = await login(fd);
    expect(result.success).toBe(true);
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "jane@example.com",
      password: "Abcdefg1",
      redirectTo: "/dashboard",
    });
  });

  it("should return error for invalid credentials (AuthError)", async () => {
    mockSignIn.mockRejectedValue(new AuthError("CredentialsSignin"));
    const fd = buildFormData({ email: "jane@example.com", password: "wrong" });
    const result = await login(fd);
    expect(result.error).toContain("Invalid email or password");
  });
});
