import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import crypto from "crypto";

import {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  deleteEmailVerificationToken,
} from "@/lib/tokens";

beforeEach(() => {
  vi.restoreAllMocks();
});

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// -----------------------------------------------------------------------
// generatePasswordResetToken
// -----------------------------------------------------------------------
describe("generatePasswordResetToken", () => {
  it("should delete existing tokens for the email before creating", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    await generatePasswordResetToken("test@example.com");

    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "test@example.com" },
    });
  });

  it("should return a 64-character hex string (32 bytes)", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    const token = await generatePasswordResetToken("test@example.com");

    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should store the hashed token, not the raw token", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    const rawToken = await generatePasswordResetToken("test@example.com");
    const expectedHash = hashToken(rawToken);

    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        identifier: "test@example.com",
        token: expectedHash,
      }),
    });
  });

  it("should set expiry to approximately 1 hour from now", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    const before = Date.now();
    await generatePasswordResetToken("test@example.com");
    const after = Date.now();

    const createCall = prismaMock.verificationToken.create.mock.calls[0][0];
    const expires = (createCall.data as any).expires as Date;
    const expiryMs = expires.getTime();
    const oneHourMs = 60 * 60 * 1000;

    expect(expiryMs).toBeGreaterThanOrEqual(before + oneHourMs);
    expect(expiryMs).toBeLessThanOrEqual(after + oneHourMs);
  });

  it("should generate unique tokens on successive calls", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    const token1 = await generatePasswordResetToken("test@example.com");
    const token2 = await generatePasswordResetToken("test@example.com");

    expect(token1).not.toBe(token2);
  });
});

// -----------------------------------------------------------------------
// verifyPasswordResetToken
// -----------------------------------------------------------------------
describe("verifyPasswordResetToken", () => {
  it("should return email for a valid, non-expired token", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    prismaMock.verificationToken.findFirst.mockResolvedValue({
      identifier: "test@example.com",
      token: hashedToken,
      expires: new Date(Date.now() + 3600000), // 1 hour from now
    });

    const email = await verifyPasswordResetToken(rawToken);
    expect(email).toBe("test@example.com");
  });

  it("should look up by hashed token, not raw token", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    prismaMock.verificationToken.findFirst.mockResolvedValue(null);

    await verifyPasswordResetToken(rawToken);

    expect(prismaMock.verificationToken.findFirst).toHaveBeenCalledWith({
      where: { token: hashedToken },
    });
  });

  it("should return null for a non-existent token", async () => {
    prismaMock.verificationToken.findFirst.mockResolvedValue(null);

    const result = await verifyPasswordResetToken("nonexistent");
    expect(result).toBeNull();
  });

  it("should return null for an expired token", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    prismaMock.verificationToken.findFirst.mockResolvedValue({
      identifier: "test@example.com",
      token: hashedToken,
      expires: new Date(Date.now() - 1000), // expired 1 second ago
    });

    const result = await verifyPasswordResetToken(rawToken);
    expect(result).toBeNull();
  });
});

// -----------------------------------------------------------------------
// deletePasswordResetToken
// -----------------------------------------------------------------------
describe("deletePasswordResetToken", () => {
  it("should delete by hashed token", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 1 });

    await deletePasswordResetToken(rawToken);

    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { token: hashedToken },
    });
  });

  it("should not throw when token does not exist", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      deletePasswordResetToken("nonexistent"),
    ).resolves.not.toThrow();
  });
});

// -----------------------------------------------------------------------
// generateEmailVerificationToken
// -----------------------------------------------------------------------
describe("generateEmailVerificationToken", () => {
  it("should delete existing tokens for the prefixed identifier", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    await generateEmailVerificationToken("test@example.com");

    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "email-verify:test@example.com" },
    });
  });

  it("should return a 64-character hex string (32 bytes)", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    const token = await generateEmailVerificationToken("test@example.com");

    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should store the hashed token with prefixed identifier", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    const rawToken = await generateEmailVerificationToken("test@example.com");
    const expectedHash = hashToken(rawToken);

    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        identifier: "email-verify:test@example.com",
        token: expectedHash,
      }),
    });
  });

  it("should set expiry to approximately 24 hours from now", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.verificationToken.create.mockResolvedValue({} as any);

    const before = Date.now();
    await generateEmailVerificationToken("test@example.com");
    const after = Date.now();

    const createCall = prismaMock.verificationToken.create.mock.calls[0][0];
    const expires = (createCall.data as any).expires as Date;
    const expiryMs = expires.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    expect(expiryMs).toBeGreaterThanOrEqual(before + twentyFourHoursMs);
    expect(expiryMs).toBeLessThanOrEqual(after + twentyFourHoursMs);
  });
});

// -----------------------------------------------------------------------
// verifyEmailVerificationToken
// -----------------------------------------------------------------------
describe("verifyEmailVerificationToken", () => {
  it("should return email for a valid, non-expired token", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    prismaMock.verificationToken.findFirst.mockResolvedValue({
      identifier: "email-verify:test@example.com",
      token: hashedToken,
      expires: new Date(Date.now() + 86400000),
    });

    const email = await verifyEmailVerificationToken(rawToken);
    expect(email).toBe("test@example.com");
  });

  it("should return null for a non-existent token", async () => {
    prismaMock.verificationToken.findFirst.mockResolvedValue(null);

    const result = await verifyEmailVerificationToken("nonexistent");
    expect(result).toBeNull();
  });

  it("should return null for an expired token", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    prismaMock.verificationToken.findFirst.mockResolvedValue({
      identifier: "email-verify:test@example.com",
      token: hashedToken,
      expires: new Date(Date.now() - 1000),
    });

    const result = await verifyEmailVerificationToken(rawToken);
    expect(result).toBeNull();
  });

  it("should return null if identifier does not have email-verify prefix", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    prismaMock.verificationToken.findFirst.mockResolvedValue({
      identifier: "test@example.com",
      token: hashedToken,
      expires: new Date(Date.now() + 86400000),
    });

    const result = await verifyEmailVerificationToken(rawToken);
    expect(result).toBeNull();
  });
});

// -----------------------------------------------------------------------
// deleteEmailVerificationToken
// -----------------------------------------------------------------------
describe("deleteEmailVerificationToken", () => {
  it("should delete by hashed token", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 1 });

    await deleteEmailVerificationToken(rawToken);

    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { token: hashedToken },
    });
  });

  it("should not throw when token does not exist", async () => {
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      deleteEmailVerificationToken("nonexistent"),
    ).resolves.not.toThrow();
  });
});
