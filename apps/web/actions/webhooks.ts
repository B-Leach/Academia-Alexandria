"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { rateLimitByUser } from "@/lib/rate-limit";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/webhooks";

const MAX_WEBHOOKS_PER_USER = 5;

export async function createWebhook(url: string, events: string[]) {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return { error: "URL is required" };

  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol !== "https:") {
      return { error: "Webhook URL must use HTTPS" };
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return { error: "Webhook URL cannot point to a private or local address" };
    }
  } catch {
    return { error: "Invalid URL" };
  }

  const validEvents = events.filter((e): e is WebhookEvent =>
    WEBHOOK_EVENTS.includes(e as WebhookEvent),
  );
  if (validEvents.length === 0) {
    return { error: "Select at least one event" };
  }

  const existing = await db.webhook.count({ where: { userId } });
  if (existing >= MAX_WEBHOOKS_PER_USER) {
    return { error: `Maximum ${MAX_WEBHOOKS_PER_USER} webhooks allowed` };
  }

  const secret = randomBytes(32).toString("hex");

  const webhook = await db.webhook.create({
    data: {
      userId,
      url: trimmedUrl,
      secret,
      events: validEvents,
    },
    select: { id: true },
  });

  return { success: true, webhookId: webhook.id, secret };
}

export async function listWebhooks() {
  const authResult = await requireUser();
  if (typeof authResult === "string") return [];
  const userId = authResult.id;

  const webhooks = await db.webhook.findMany({
    where: { userId },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return webhooks;
}

export async function deleteWebhook(webhookId: string) {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const webhook = await db.webhook.findUnique({
    where: { id: webhookId },
    select: { userId: true },
  });

  if (!webhook || webhook.userId !== userId) {
    return { error: "Webhook not found" };
  }

  await db.webhook.delete({ where: { id: webhookId } });

  return { success: true };
}
