import crypto from "crypto";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Valid preference keys (must match User model boolean fields)
// ---------------------------------------------------------------------------

export const VALID_PREF_KEYS = [
  "notifyReviews",
  "notifyComments",
  "notifyEndorsements",
  "notifyPaperStatus",
  "notifyBounty",
  "notifyInvitations",
] as const;

export type PrefKey = (typeof VALID_PREF_KEYS)[number];

export function isValidPrefKey(key: string): key is PrefKey {
  return (VALID_PREF_KEYS as readonly string[]).includes(key);
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

/**
 * Get or lazily create an unsubscribe token for a user.
 */
export async function getUnsubscribeToken(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { unsubscribeToken: true },
  });

  if (user?.unsubscribeToken) {
    return user.unsubscribeToken;
  }

  const token = crypto.randomUUID();
  await db.user.update({
    where: { id: userId },
    data: { unsubscribeToken: token },
  });

  return token;
}

// ---------------------------------------------------------------------------
// HMAC signing & verification
// ---------------------------------------------------------------------------

/**
 * Create an HMAC signature for an unsubscribe link.
 * Signs: userId + ":" + prefKey using the user's token as the key.
 */
export function signUnsubscribe(
  userId: string,
  prefKey: string,
  token: string,
): string {
  const hmac = crypto.createHmac("sha256", token);
  hmac.update(`${userId}:${prefKey}`);
  return hmac.digest("hex");
}

/**
 * Verify an HMAC signature with timing-safe comparison.
 */
export function verifyUnsubscribe(
  userId: string,
  prefKey: string,
  sig: string,
  token: string,
): boolean {
  const expected = signUnsubscribe(userId, prefKey, token);

  // Both are hex strings of equal length (SHA-256 = 64 hex chars)
  if (expected.length !== sig.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

// ---------------------------------------------------------------------------
// URL building
// ---------------------------------------------------------------------------

/**
 * Build a full unsubscribe URL.
 */
export function buildUnsubscribeUrl(
  userId: string,
  prefKey: string,
  token: string,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const sig = signUnsubscribe(userId, prefKey, token);
  const params = new URLSearchParams({ user: userId, pref: prefKey, sig });
  return `${baseUrl}/api/email/unsubscribe?${params.toString()}`;
}

// Human-readable names for preference keys (used in confirmation page)
export const PREF_LABELS: Record<PrefKey, string> = {
  notifyReviews: "review",
  notifyComments: "comment",
  notifyEndorsements: "endorsement",
  notifyPaperStatus: "paper status",
  notifyBounty: "bounty",
  notifyInvitations: "co-author invitation",
};
