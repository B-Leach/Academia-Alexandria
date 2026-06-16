import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanDatabase,
  createTestUser,
  createTestPaper,
  submitTestPaper,
  resetCounters,
} from "./helpers";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// Mock Stripe — only need webhooks.constructEvent for webhook tests
const mockConstructEvent = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
  isStripeEnabled: () => true,
}));

import { POST } from "@/app/api/stripe/webhook/route";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
  mockConstructEvent.mockReset();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

function makeRequest(body: string, signature = "sig_test") {
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": signature,
    },
  });
}

function checkoutCompletedEvent(metadata: Record<string, string>, paymentIntent = "pi_test_123") {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        payment_intent: paymentIntent,
        metadata,
      },
    },
  };
}

describe("Stripe Webhook Handler", () => {
  it("should return 400 when signature is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      // No stripe-signature header
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("Missing signature");
  });

  it("should return 400 when webhook secret is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("Invalid signature");
  });

  it("should create bounty on checkout.session.completed", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    const event = checkoutCompletedEvent({
      paperId: paper.id,
      userId: author.id,
      amountCents: "5000",
      maxReviews: "2",
      reviewerPoolCents: "4500",
      platformFeeCents: "500",
    });

    mockConstructEvent.mockReturnValue(event);

    const req = makeRequest(JSON.stringify(event));
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.received).toBe(true);

    // Verify bounty was created in DB
    const bounty = await db.bounty.findUnique({
      where: { paperId: paper.id },
    });
    expect(bounty).not.toBeNull();
    expect(bounty!.totalAmountCents).toBe(5000);
    expect(bounty!.reviewerPoolCents).toBe(4500);
    expect(bounty!.platformFeeCents).toBe(500);
    expect(bounty!.maxReviews).toBe(2);
    expect(bounty!.status).toBe("ACTIVE");
    expect(bounty!.stripePaymentIntentId).toBe("pi_test_123");
  });

  it("should be idempotent — not create duplicate bounty for same payment intent", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    const event = checkoutCompletedEvent({
      paperId: paper.id,
      userId: author.id,
      amountCents: "5000",
      maxReviews: "2",
      reviewerPoolCents: "4500",
      platformFeeCents: "500",
    });

    mockConstructEvent.mockReturnValue(event);

    // First call
    const req1 = makeRequest(JSON.stringify(event));
    await POST(req1);

    // Second call (replay)
    const req2 = makeRequest(JSON.stringify(event));
    await POST(req2);

    // Should only have one bounty
    const bounties = await db.bounty.findMany({
      where: { paperId: paper.id },
    });
    expect(bounties).toHaveLength(1);
  });

  it("should replace expired/completed bounties on re-purchase", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Create an expired bounty first
    await db.bounty.create({
      data: {
        paperId: paper.id,
        totalAmountCents: 3000,
        reviewerPoolCents: 2700,
        platformFeeCents: 300,
        maxReviews: 1,
        status: "EXPIRED",
      },
    });

    const event = checkoutCompletedEvent(
      {
        paperId: paper.id,
        userId: author.id,
        amountCents: "5000",
        maxReviews: "2",
        reviewerPoolCents: "4500",
        platformFeeCents: "500",
      },
      "pi_new_123"
    );

    mockConstructEvent.mockReturnValue(event);

    const req = makeRequest(JSON.stringify(event));
    await POST(req);

    // Old expired bounty should be deleted, new one created
    const bounties = await db.bounty.findMany({
      where: { paperId: paper.id },
    });
    expect(bounties).toHaveLength(1);
    expect(bounties[0].totalAmountCents).toBe(5000);
    expect(bounties[0].status).toBe("ACTIVE");
  });

  it("should ignore events without paperId in metadata", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_no_meta",
          payment_intent: "pi_no_meta",
          metadata: {},
        },
      },
    };

    mockConstructEvent.mockReturnValue(event);

    const req = makeRequest(JSON.stringify(event));
    const res = await POST(req);
    expect(res.status).toBe(200);

    // No bounty should be created
    const count = await db.bounty.count();
    expect(count).toBe(0);
  });

  it("should ignore unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: {} },
    });

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
