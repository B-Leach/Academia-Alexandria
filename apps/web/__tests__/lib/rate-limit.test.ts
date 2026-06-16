import { describe, it, expect, beforeEach } from "vitest";
import {
  rateLimitByIp,
  rateLimitByUser,
  checkApiRateLimit,
  resetAllLimiters,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetAllLimiters();
});

// ============================================================
// rateLimitByUser
// ============================================================

describe("rateLimitByUser", () => {
  it("should allow requests under the limit", async () => {
    const result = await rateLimitByUser("write", "user-1");
    expect(result).toBeNull();
  });

  it("should block requests over the limit", async () => {
    // write tier: 20 per 15 min
    for (let i = 0; i < 20; i++) {
      expect(await rateLimitByUser("write", "user-1")).toBeNull();
    }
    const result = await rateLimitByUser("write", "user-1");
    expect(result).toEqual({ error: "Too many requests. Please try again later." });
  });

  it("should track different users independently", async () => {
    for (let i = 0; i < 20; i++) {
      await rateLimitByUser("write", "user-1");
    }
    // user-1 is blocked
    expect(await rateLimitByUser("write", "user-1")).not.toBeNull();
    // user-2 is not
    expect(await rateLimitByUser("write", "user-2")).toBeNull();
  });

  it("should track different limiter tiers independently", async () => {
    // auth tier: 5 per 15 min
    for (let i = 0; i < 5; i++) {
      expect(await rateLimitByUser("auth", "user-1")).toBeNull();
    }
    expect(await rateLimitByUser("auth", "user-1")).not.toBeNull();
    // write tier still has capacity for the same user
    expect(await rateLimitByUser("write", "user-1")).toBeNull();
  });

  it("should respect auth tier limit of 5", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await rateLimitByUser("auth", "user-1")).toBeNull();
    }
    expect(await rateLimitByUser("auth", "user-1")).toEqual({
      error: "Too many requests. Please try again later.",
    });
  });

  it("should respect upload tier limit of 10", async () => {
    for (let i = 0; i < 10; i++) {
      expect(await rateLimitByUser("upload", "user-1")).toBeNull();
    }
    expect(await rateLimitByUser("upload", "user-1")).not.toBeNull();
  });

  it("should respect read tier limit of 60", async () => {
    for (let i = 0; i < 60; i++) {
      expect(await rateLimitByUser("read", "user-1")).toBeNull();
    }
    expect(await rateLimitByUser("read", "user-1")).not.toBeNull();
  });
});

// ============================================================
// rateLimitByIp (async, uses headers())
// ============================================================

describe("rateLimitByIp", () => {
  it("should allow requests under the limit", async () => {
    const result = await rateLimitByIp("auth");
    expect(result).toBeNull();
  });

  it("should block requests over the limit", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await rateLimitByIp("auth")).toBeNull();
    }
    const result = await rateLimitByIp("auth");
    expect(result).toEqual({ error: "Too many requests. Please try again later." });
  });
});

// ============================================================
// checkApiRateLimit (returns NextResponse or null)
// ============================================================

describe("checkApiRateLimit", () => {
  it("should return null when under the limit", async () => {
    const result = await checkApiRateLimit("upload", "user-1");
    expect(result).toBeNull();
  });

  it("should return 429 Response when over the limit", async () => {
    for (let i = 0; i < 10; i++) {
      await checkApiRateLimit("upload", `user-1`);
    }
    const result = await checkApiRateLimit("upload", "user-1");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);

    const body = await result!.json();
    expect(body.error).toBe("Too many requests. Please try again later.");
  });

  it("should include Retry-After header", async () => {
    for (let i = 0; i < 10; i++) {
      await checkApiRateLimit("upload", "user-1");
    }
    const result = await checkApiRateLimit("upload", "user-1");
    expect(result).not.toBeNull();
    const retryAfter = result!.headers.get("Retry-After");
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });
});

// ============================================================
// resetAllLimiters
// ============================================================

describe("resetAllLimiters", () => {
  it("should clear all limiter state", async () => {
    // Exhaust auth limiter
    for (let i = 0; i < 5; i++) {
      await rateLimitByUser("auth", "user-1");
    }
    expect(await rateLimitByUser("auth", "user-1")).not.toBeNull();

    // Reset
    resetAllLimiters();

    // Should be allowed again
    expect(await rateLimitByUser("auth", "user-1")).toBeNull();
  });
});
