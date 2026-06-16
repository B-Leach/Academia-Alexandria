import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import {
  signUnsubscribe,
  verifyUnsubscribe,
  buildUnsubscribeUrl,
  getUnsubscribeToken,
  isValidPrefKey,
  VALID_PREF_KEYS,
} from "@/lib/unsubscribe";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
});

// -----------------------------------------------------------------------
// isValidPrefKey
// -----------------------------------------------------------------------
describe("isValidPrefKey", () => {
  it("should accept all valid preference keys", () => {
    for (const key of VALID_PREF_KEYS) {
      expect(isValidPrefKey(key)).toBe(true);
    }
  });

  it("should reject invalid preference keys", () => {
    expect(isValidPrefKey("notifyFoo")).toBe(false);
    expect(isValidPrefKey("")).toBe(false);
    expect(isValidPrefKey("notifyReview")).toBe(false); // missing 's'
  });
});

// -----------------------------------------------------------------------
// signUnsubscribe & verifyUnsubscribe
// -----------------------------------------------------------------------
describe("HMAC sign/verify", () => {
  const userId = "user-123";
  const prefKey = "notifyReviews";
  const token = "test-token-abc";

  it("should produce a hex string signature", () => {
    const sig = signUnsubscribe(userId, prefKey, token);
    expect(sig).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
  });

  it("should verify a valid signature", () => {
    const sig = signUnsubscribe(userId, prefKey, token);
    expect(verifyUnsubscribe(userId, prefKey, sig, token)).toBe(true);
  });

  it("should reject a tampered signature", () => {
    const sig = signUnsubscribe(userId, prefKey, token);
    const tampered = sig.replace(sig[0], sig[0] === "a" ? "b" : "a");
    expect(verifyUnsubscribe(userId, prefKey, tampered, token)).toBe(false);
  });

  it("should reject wrong userId", () => {
    const sig = signUnsubscribe(userId, prefKey, token);
    expect(verifyUnsubscribe("wrong-user", prefKey, sig, token)).toBe(false);
  });

  it("should reject wrong prefKey", () => {
    const sig = signUnsubscribe(userId, prefKey, token);
    expect(verifyUnsubscribe(userId, "notifyComments", sig, token)).toBe(false);
  });

  it("should reject wrong token", () => {
    const sig = signUnsubscribe(userId, prefKey, token);
    expect(verifyUnsubscribe(userId, prefKey, sig, "wrong-token")).toBe(false);
  });

  it("should reject signature of wrong length", () => {
    expect(verifyUnsubscribe(userId, prefKey, "short", token)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// buildUnsubscribeUrl
// -----------------------------------------------------------------------
describe("buildUnsubscribeUrl", () => {
  it("should build a valid URL with user, pref, and sig params", () => {
    const url = buildUnsubscribeUrl("user-1", "notifyReviews", "my-token");
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://example.com");
    expect(parsed.pathname).toBe("/api/email/unsubscribe");
    expect(parsed.searchParams.get("user")).toBe("user-1");
    expect(parsed.searchParams.get("pref")).toBe("notifyReviews");
    expect(parsed.searchParams.get("sig")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should use localhost when NEXT_PUBLIC_APP_URL is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const url = buildUnsubscribeUrl("user-1", "notifyReviews", "token");
    expect(url).toContain("http://localhost:3000");
  });
});

// -----------------------------------------------------------------------
// getUnsubscribeToken
// -----------------------------------------------------------------------
describe("getUnsubscribeToken", () => {
  it("should return existing token if user already has one", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      unsubscribeToken: "existing-token",
    } as any);

    const token = await getUnsubscribeToken("user-1");
    expect(token).toBe("existing-token");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("should generate and store a new token if user has none", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      unsubscribeToken: null,
    } as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const token = await getUnsubscribeToken("user-1");

    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(0);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { unsubscribeToken: token },
    });
  });

  it("should generate token when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({} as any);

    const token = await getUnsubscribeToken("user-1");
    expect(token).toBeTruthy();
  });
});
