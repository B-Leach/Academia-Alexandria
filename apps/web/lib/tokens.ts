import crypto from "crypto";
import { db } from "@/lib/db";

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const EMAIL_VERIFY_PREFIX = "email-verify:";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a password reset token for the given email.
 * Deletes any existing tokens for this email first.
 * Returns the raw (unhashed) token to include in the reset URL.
 */
export async function generatePasswordResetToken(
  email: string,
): Promise<string> {
  // Delete any existing tokens for this email
  await db.verificationToken.deleteMany({
    where: { identifier: email },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);

  await db.verificationToken.create({
    data: {
      identifier: email,
      token: hashedToken,
      expires: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
    },
  });

  return rawToken;
}

/**
 * Verify a password reset token.
 * Returns the associated email if valid, null if invalid or expired.
 */
export async function verifyPasswordResetToken(
  rawToken: string,
): Promise<string | null> {
  const hashedToken = hashToken(rawToken);

  const record = await db.verificationToken.findFirst({
    where: { token: hashedToken },
  });

  if (!record) return null;
  if (record.expires < new Date()) return null;

  return record.identifier;
}

/**
 * Delete a password reset token after use.
 */
export async function deletePasswordResetToken(
  rawToken: string,
): Promise<void> {
  const hashedToken = hashToken(rawToken);

  await db.verificationToken.deleteMany({
    where: { token: hashedToken },
  });
}

/**
 * Generate an email verification token for the given email.
 * Uses a prefix to distinguish from password reset tokens.
 * Returns the raw (unhashed) token to include in the verification URL.
 */
export async function generateEmailVerificationToken(
  email: string,
): Promise<string> {
  const identifier = `${EMAIL_VERIFY_PREFIX}${email}`;

  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);

  await db.verificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      expires: new Date(Date.now() + EMAIL_VERIFY_EXPIRY_MS),
    },
  });

  return rawToken;
}

/**
 * Verify an email verification token.
 * Returns the associated email if valid, null if invalid or expired.
 */
export async function verifyEmailVerificationToken(
  rawToken: string,
): Promise<string | null> {
  const hashedToken = hashToken(rawToken);

  const record = await db.verificationToken.findFirst({
    where: { token: hashedToken },
  });

  if (!record) return null;
  if (record.expires < new Date()) return null;
  if (!record.identifier.startsWith(EMAIL_VERIFY_PREFIX)) return null;

  return record.identifier.slice(EMAIL_VERIFY_PREFIX.length);
}

/**
 * Delete an email verification token after use.
 */
export async function deleteEmailVerificationToken(
  rawToken: string,
): Promise<void> {
  const hashedToken = hashToken(rawToken);

  await db.verificationToken.deleteMany({
    where: { token: hashedToken },
  });
}
