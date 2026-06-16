import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanDatabase,
  createTestUser,
  setAuthenticatedAs,
  setUnauthenticated,
  resetCounters,
} from "./helpers";
import { db } from "@/lib/db";

// Mock Stripe
const mockTransfersCreate = vi.fn();
const mockAccountsRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    transfers: { create: (...args: unknown[]) => mockTransfersCreate(...args) },
    accounts: { retrieve: (...args: unknown[]) => mockAccountsRetrieve(...args) },
  },
  isStripeEnabled: () => true,
}));

import { POST } from "@/app/api/stripe/claim-payout/route";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
  mockTransfersCreate.mockReset();
  mockAccountsRetrieve.mockReset();
});

async function createPaperWithBountyAndPendingPayout(
  authorId: string,
  reviewerId: string,
  amountCents = 2125
) {
  const paper = await db.paper.create({
    data: {
      title: "Bounty Paper",
      abstract: "Test abstract for the bounty paper being tested.",
      content: "Test content.",
      disciplines: ["computer-science"],
      keywords: [],
      status: "SUBMITTED",
      publishedAt: new Date(),
      authors: {
        create: [{ userId: authorId, order: 0, isCorresponding: true }],
      },
    },
  });

  const bounty = await db.bounty.create({
    data: {
      paperId: paper.id,
      totalAmountCents: 5000,
      reviewerPoolCents: 4500,
      platformFeeCents: 500,
      maxReviews: 2,
      status: "ACTIVE",
    },
  });

  const payout = await db.bountyPayout.create({
    data: {
      bountyId: bounty.id,
      recipientUserId: reviewerId,
      amountCents,
      stripeTransferId: null,
      paidAt: null,
    },
  });

  return { paper, bounty, payout };
}

describe("Stripe Claim Payout Route", () => {
  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("should return 400 when user has no Stripe account", async () => {
    const user = await createTestUser({ name: "No Stripe" });
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const res = await POST();
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("connect a Stripe account");
  });

  it("should return 400 when Stripe account is not verified", async () => {
    const user = await createTestUser({ name: "Unverified" });
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: "acct_unverified" },
    });

    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: false });

    const res = await POST();
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("not fully verified");
  });

  it("should return zero when no pending payouts exist", async () => {
    const user = await createTestUser({ name: "No Payouts" });
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: "acct_no_payouts" },
    });

    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });

    const res = await POST();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.claimed).toBe(0);
    expect(json.totalCents).toBe(0);
  });

  it("should claim pending payouts and create Stripe transfers", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    await db.user.update({
      where: { id: reviewer.id },
      data: { stripeConnectAccountId: "acct_claim_test" },
    });

    const { payout } = await createPaperWithBountyAndPendingPayout(
      author.id,
      reviewer.id,
      2125
    );

    setAuthenticatedAs({ id: reviewer.id, name: reviewer.name!, email: reviewer.email! });
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });
    mockTransfersCreate.mockResolvedValue({ id: "tr_claimed_123" });

    const res = await POST();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.claimed).toBe(1);
    expect(json.totalCents).toBe(2125);

    // Verify payout was updated in DB
    const updated = await db.bountyPayout.findUnique({
      where: { id: payout.id },
    });
    expect(updated!.stripeTransferId).toBe("tr_claimed_123");
    expect(updated!.paidAt).not.toBeNull();
  });

  it("should claim multiple pending payouts", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    await db.user.update({
      where: { id: reviewer.id },
      data: { stripeConnectAccountId: "acct_multi_claim" },
    });

    // Create two papers with pending payouts
    await createPaperWithBountyAndPendingPayout(author.id, reviewer.id, 2125);
    await createPaperWithBountyAndPendingPayout(author.id, reviewer.id, 1500);

    setAuthenticatedAs({ id: reviewer.id, name: reviewer.name!, email: reviewer.email! });
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });

    let transferCount = 0;
    mockTransfersCreate.mockImplementation(() => {
      transferCount++;
      return { id: `tr_multi_${transferCount}` };
    });

    const res = await POST();
    const json = await res.json();

    expect(json.claimed).toBe(2);
    expect(json.totalCents).toBe(3625);
    expect(mockTransfersCreate).toHaveBeenCalledTimes(2);
  });

  it("should continue claiming remaining payouts if one transfer fails", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    await db.user.update({
      where: { id: reviewer.id },
      data: { stripeConnectAccountId: "acct_partial" },
    });

    await createPaperWithBountyAndPendingPayout(author.id, reviewer.id, 2000);
    await createPaperWithBountyAndPendingPayout(author.id, reviewer.id, 1000);

    setAuthenticatedAs({ id: reviewer.id, name: reviewer.name!, email: reviewer.email! });
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });

    let callCount = 0;
    mockTransfersCreate.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error("Stripe error");
      return { id: "tr_second_ok" };
    });

    const res = await POST();
    const json = await res.json();

    // Only second one should succeed
    expect(json.claimed).toBe(1);

    // Verify one is still pending, one is claimed
    const pending = await db.bountyPayout.findMany({
      where: { recipientUserId: reviewer.id, stripeTransferId: null },
    });
    const claimed = await db.bountyPayout.findMany({
      where: { recipientUserId: reviewer.id, stripeTransferId: { not: null } },
    });
    expect(pending).toHaveLength(1);
    expect(claimed).toHaveLength(1);
  });

  it("should not claim payouts belonging to other users", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });

    await db.user.update({
      where: { id: reviewer1.id },
      data: { stripeConnectAccountId: "acct_r1" },
    });

    // Payout belongs to reviewer2, not reviewer1
    await createPaperWithBountyAndPendingPayout(author.id, reviewer2.id, 2125);

    setAuthenticatedAs({ id: reviewer1.id, name: reviewer1.name!, email: reviewer1.email! });
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });

    const res = await POST();
    const json = await res.json();

    expect(json.claimed).toBe(0);
    expect(json.totalCents).toBe(0);
    expect(mockTransfersCreate).not.toHaveBeenCalled();
  });
});
