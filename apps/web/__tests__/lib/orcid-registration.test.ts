import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createOrcidRegistrationToken,
  verifyOrcidRegistrationToken,
} from "@/lib/orcid-registration";

// Set AUTH_SECRET for token signing
beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-for-orcid-tokens";
});

afterEach(() => {
  vi.restoreAllMocks();
});

const validData = {
  orcidId: "0000-0002-1825-0097",
  name: "Jane Smith",
};

describe("createOrcidRegistrationToken", () => {
  it("should return a string with two dot-separated parts", () => {
    const token = createOrcidRegistrationToken(validData);
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("should produce different tokens for different data", () => {
    const token1 = createOrcidRegistrationToken(validData);
    const token2 = createOrcidRegistrationToken({
      orcidId: "0000-0001-1234-5678",
      name: "John Doe",
    });
    expect(token1).not.toBe(token2);
  });
});

describe("verifyOrcidRegistrationToken", () => {
  it("should return the original data for a valid token", () => {
    const token = createOrcidRegistrationToken(validData);
    const result = verifyOrcidRegistrationToken(token);
    expect(result).toEqual(validData);
  });

  it("should return null for a tampered payload", () => {
    const token = createOrcidRegistrationToken(validData);
    const [, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        orcidId: "0000-0000-0000-0000",
        name: "Hacker",
        exp: Date.now() + 99999999,
      }),
    ).toString("base64url");
    const result = verifyOrcidRegistrationToken(
      `${tamperedPayload}.${signature}`,
    );
    expect(result).toBeNull();
  });

  it("should return null for a tampered signature", () => {
    const token = createOrcidRegistrationToken(validData);
    const [payload] = token.split(".");
    const result = verifyOrcidRegistrationToken(`${payload}.invalidsignature`);
    expect(result).toBeNull();
  });

  it("should return null for an expired token", () => {
    // Mock Date.now to create a token, then advance past expiry
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const token = createOrcidRegistrationToken(validData);

    // Advance 16 minutes past expiry
    vi.spyOn(Date, "now").mockReturnValue(now + 16 * 60 * 1000);
    const result = verifyOrcidRegistrationToken(token);
    expect(result).toBeNull();
  });

  it("should return data for a non-expired token", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const token = createOrcidRegistrationToken(validData);

    // Advance 14 minutes (still within 15 min window)
    vi.spyOn(Date, "now").mockReturnValue(now + 14 * 60 * 1000);
    const result = verifyOrcidRegistrationToken(token);
    expect(result).toEqual(validData);
  });

  it("should return null for an empty string", () => {
    expect(verifyOrcidRegistrationToken("")).toBeNull();
  });

  it("should return null for a malformed token (no dot)", () => {
    expect(verifyOrcidRegistrationToken("nodothere")).toBeNull();
  });

  it("should return null for a token with too many parts", () => {
    expect(verifyOrcidRegistrationToken("a.b.c")).toBeNull();
  });

  it("should return null for invalid base64 payload", () => {
    expect(verifyOrcidRegistrationToken("!!!invalid!!!.abcdef1234")).toBeNull();
  });

  it("should return null when AUTH_SECRET changes", () => {
    const token = createOrcidRegistrationToken(validData);
    process.env.AUTH_SECRET = "different-secret";
    const result = verifyOrcidRegistrationToken(token);
    expect(result).toBeNull();
  });
});
