import { createHmac } from "crypto";
import { db } from "@/lib/db";

export type WebhookEvent =
  | "paper.published"
  | "paper.retracted"
  | "review.submitted"
  | "endorsement.received";

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "paper.published",
  "paper.retracted",
  "review.submitted",
  "endorsement.received",
];

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchWebhooks(
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const webhooks = await db.webhook.findMany({
    where: { active: true, events: { has: event } },
    select: { url: true, secret: true },
  });

  if (webhooks.length === 0) return;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  const promises = webhooks.map(async (wh) => {
    const signature = signPayload(body, wh.secret);
    try {
      await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      console.warn(`Webhook delivery failed for ${wh.url} (${event}):`, err instanceof Error ? err.message : err);
    }
  });

  await Promise.allSettled(promises);
}
