"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { rateLimitByUser } from "@/lib/rate-limit";
import { generateApiKey } from "@/lib/api-auth";

const MAX_KEYS_PER_USER = 5;

export async function createApiKey(name: string) {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > 100) {
    return { error: "Name is required and must be under 100 characters" };
  }

  const existing = await db.apiKey.count({ where: { userId } });
  if (existing >= MAX_KEYS_PER_USER) {
    return { error: `Maximum ${MAX_KEYS_PER_USER} API keys allowed` };
  }

  const { key, prefix, hash } = generateApiKey();

  await db.apiKey.create({
    data: {
      userId,
      keyHash: hash,
      keyPrefix: prefix,
      name: trimmedName,
    },
  });

  return { success: true, key };
}

export async function listApiKeys() {
  const authResult = await requireUser();
  if (typeof authResult === "string") return [];
  const userId = authResult.id;

  const keys = await db.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return keys;
}

export async function revokeApiKey(keyId: string) {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const key = await db.apiKey.findUnique({
    where: { id: keyId },
    select: { userId: true },
  });

  if (!key || key.userId !== userId) {
    return { error: "API key not found" };
  }

  await db.apiKey.delete({ where: { id: keyId } });

  return { success: true };
}
