import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

const API_KEY_PREFIX = "aa_";
const KEY_LENGTH = 32;

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): {
  key: string;
  prefix: string;
  hash: string;
} {
  const raw = randomBytes(KEY_LENGTH).toString("hex");
  const key = `${API_KEY_PREFIX}${raw}`;
  const prefix = key.slice(0, 10);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

type ApiKeyTierType = "FREE" | "BASIC" | "PREMIUM";

export async function authenticateApiKey(
  authHeader: string | null,
): Promise<{ userId: string; tier: ApiKeyTierType } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const key = authHeader.slice(7);
  if (!key.startsWith(API_KEY_PREFIX)) return null;

  const hash = hashApiKey(key);
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, userId: true, tier: true, expiresAt: true, user: { select: { bannedAt: true } } },
  });

  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  if (apiKey.user.bannedAt) return null;

  // Fire-and-forget lastUsedAt update
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { userId: apiKey.userId, tier: apiKey.tier };
}
