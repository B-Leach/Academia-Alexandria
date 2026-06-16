import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanDatabase,
  createTestUser,
  createTestPaper,
  submitTestPaper,
  publishTestPaper,
  setAuthenticatedAs,
  setUnauthenticated,
  resetCounters,
} from "./helpers";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// Mock Stripe
const mockCheckoutSessionsCreate = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCheckoutSessionsCreate(...args),
      },
    },
  },
  isStripeEnabled: () => true,
}));

import { POST } from "@/app/api/stripe/checkout/route";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
  mockCheckoutSessionsCreate.mockReset();
  mockCheckoutSessionsCreate.mockResolvedValue({
    url: "https://checkout.stripe.com/test-session",
  });
});

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Stripe Checkout Route", () => {
  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();

    const req = makeRequest({
      paperId: "p1",
      perReviewCents: 5000,
      maxReviews: 3,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid body", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const req = makeRequest({ paperId: "", perReviewCents: 5, maxReviews: 0 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 for amount below minimum", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const req = makeRequest({ paperId: "p1", perReviewCents: 100, maxReviews: 3 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 403 when user is not an author", async () => {
    const author = await createTestUser({ name: "Author" });
    const stranger = await createTestUser({ name: "Stranger" });

    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs({
      id: stranger.id,
      name: stranger.name!,
      email: stranger.email!,
    });

    const req = makeRequest({
      paperId: paper.id,
      perReviewCents: 5000,
      maxReviews: 3,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.error).toContain("not an author");
  });

  it("should return 400 when paper is a draft", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id); // DRAFT by default

    setAuthenticatedAs({
      id: author.id,
      name: author.name!,
      email: author.email!,
    });

    const req = makeRequest({
      paperId: paper.id,
      perReviewCents: 5000,
      maxReviews: 3,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("submitted or published");
  });

  it("should return 400 when paper already has an active bounty", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Create existing active bounty
    await db.bounty.create({
      data: {
        paperId: paper.id,
        totalAmountCents: 3000,
        reviewerPoolCents: 2700,
        platformFeeCents: 300,
        maxReviews: 1,
        status: "ACTIVE",
      },
    });

    setAuthenticatedAs({
      id: author.id,
      name: author.name!,
      email: author.email!,
    });

    const req = makeRequest({
      paperId: paper.id,
      perReviewCents: 5000,
      maxReviews: 3,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("already has an active bounty");
  });

  it("should create checkout session for submitted paper", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs({
      id: author.id,
      name: author.name!,
      email: author.email!,
    });

    const req = makeRequest({
      paperId: paper.id,
      perReviewCents: 5000,
      maxReviews: 3,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/test-session");

    // Verify Stripe was called with correct params
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: expect.objectContaining({
          paperId: paper.id,
          maxReviews: "3",
          reviewerPoolCents: "15000",
        }),
      }),
    );
  });

  it("should create checkout session for published paper", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs({
      id: author.id,
      name: author.name!,
      email: author.email!,
    });

    const req = makeRequest({
      paperId: paper.id,
      perReviewCents: 5000,
      maxReviews: 3,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("should include correct split in metadata", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs({
      id: author.id,
      name: author.name!,
      email: author.email!,
    });

    const req = makeRequest({
      paperId: paper.id,
      perReviewCents: 10000,
      maxReviews: 3,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // $100/review × 3 = $300 pool, total = ceil(30000/0.9) = 33334, fee = 3334
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          reviewerPoolCents: "30000",
          platformFeeCents: "3334",
        }),
      }),
    );
  });

  it("should allow bounty when previous bounty is expired", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Create expired bounty (should not block)
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

    setAuthenticatedAs({
      id: author.id,
      name: author.name!,
      email: author.email!,
    });

    const req = makeRequest({
      paperId: paper.id,
      perReviewCents: 5000,
      maxReviews: 3,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
