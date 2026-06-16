import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanDatabase,
  createTestUser,
  createTestPaper,
  submitTestPaper,
  setAuthenticatedAs,
  buildReviewFormData,
  resetCounters,
  addResearchAreas,
} from "./helpers";
import { db } from "@/lib/db";

// Mock Stripe so no real API calls happen
const mockTransfersCreate = vi.fn();
const mockAccountsRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    transfers: { create: (...args: unknown[]) => mockTransfersCreate(...args) },
    accounts: {
      retrieve: (...args: unknown[]) => mockAccountsRetrieve(...args),
    },
  },
  isStripeEnabled: () => true,
}));

import { createReview } from "@/actions/review";
import { getBounty, getPendingPayouts } from "@/actions/bounty";
import { processBountyPayout } from "@/lib/bounty-payout";
import { tryAcceptPaper } from "@/lib/paper-acceptance";
import { REPUTATION_POINTS, REVIEW_DEFAULTS } from "@academia-alexandria/shared";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
  mockTransfersCreate.mockReset();
  mockAccountsRetrieve.mockReset();
});

describe("Bounty Payout Integration", () => {
  it("should process payout when reviewer has a connected Stripe account", async () => {
    // Setup: author creates paper, bounty is added manually to DB
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    await addResearchAreas(reviewer.id, ["computer-science"]);

    // Give reviewer a Stripe Connect account
    await db.user.update({
      where: { id: reviewer.id },
      data: { stripeConnectAccountId: "acct_test_reviewer" },
    });

    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Create an active bounty on the paper (90/10 split)
    await db.bounty.create({
      data: {
        paperId: paper.id,
        totalAmountCents: 5000,
        reviewerPoolCents: 4500,
        platformFeeCents: 500,
        maxReviews: 2,
        status: "ACTIVE",
        stripePaymentIntentId: "pi_test_123",
      },
    });

    // Mock Stripe account as verified
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });
    mockTransfersCreate.mockResolvedValue({ id: "tr_test_123" });

    // Reviewer submits a review
    setAuthenticatedAs({
      id: reviewer.id,
      name: reviewer.name!,
      email: reviewer.email!,
    });

    const result = await createReview(buildReviewFormData(paper.id));
    expect(result.success).toBe(true);

    // Payouts happen after cool-off — trigger directly to test mechanism
    const review = await db.review.findFirst({
      where: { reviewerId: reviewer.id, paperId: paper.id },
      select: { id: true },
    });
    await processBountyPayout(paper.id, reviewer.id, review!.id);

    // Verify payout was created
    const payouts = await db.bountyPayout.findMany({
      where: { recipientUserId: reviewer.id },
    });
    expect(payouts).toHaveLength(1);
    expect(payouts[0].amountCents).toBe(Math.floor(4500 / 2));
    expect(payouts[0].stripeTransferId).toBe("tr_test_123");
    expect(payouts[0].paidAt).not.toBeNull();

    // Verify Stripe transfer was called correctly
    expect(mockTransfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: Math.floor(4500 / 2),
        destination: "acct_test_reviewer",
      }),
    );

    // Verify reputation was awarded
    const repEvents = await db.reputationEvent.findMany({
      where: { userId: reviewer.id, type: "BOUNTY_REVIEW_COMPLETED" },
    });
    expect(repEvents).toHaveLength(1);
    expect(repEvents[0].points).toBe(REPUTATION_POINTS.BOUNTY_REVIEW_COMPLETED);
  });

  it("should create pending payout when reviewer has no Stripe account", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer No Stripe" });
    await addResearchAreas(reviewer.id, ["computer-science"]);

    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

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
      id: reviewer.id,
      name: reviewer.name!,
      email: reviewer.email!,
    });

    const result = await createReview(buildReviewFormData(paper.id));
    expect(result.success).toBe(true);

    // Payouts happen after cool-off — trigger directly to test mechanism
    const review = await db.review.findFirst({
      where: { reviewerId: reviewer.id, paperId: paper.id },
      select: { id: true },
    });
    await processBountyPayout(paper.id, reviewer.id, review!.id);

    // Payout should be pending (no transfer)
    const payouts = await db.bountyPayout.findMany({
      where: { recipientUserId: reviewer.id },
    });
    expect(payouts).toHaveLength(1);
    expect(payouts[0].stripeTransferId).toBeNull();
    expect(payouts[0].paidAt).toBeNull();

    // Stripe should NOT have been called
    expect(mockTransfersCreate).not.toHaveBeenCalled();

    // Pending payouts action should find it (uses current auth session)
    const pending = await getPendingPayouts();
    expect(pending.count).toBe(1);
    expect(pending.totalCents).toBe(2700); // all goes to single reviewer
  });

  it("should complete bounty when all review slots are filled", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });
    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    await db.bounty.create({
      data: {
        paperId: paper.id,
        totalAmountCents: 5000,
        reviewerPoolCents: 4500,
        platformFeeCents: 500,
        maxReviews: 3,
        status: "ACTIVE",
      },
    });

    // Review 1
    setAuthenticatedAs({
      id: reviewer1.id,
      name: reviewer1.name!,
      email: reviewer1.email!,
    });
    await createReview(buildReviewFormData(paper.id));

    // No payouts yet — cool-off hasn't started (need 3 qualifying reviews)
    let bounty = await getBounty(paper.id);
    expect(bounty!.status).toBe("ACTIVE");
    expect(bounty!.payoutCount).toBe(0);

    // Review 2
    setAuthenticatedAs({
      id: reviewer2.id,
      name: reviewer2.name!,
      email: reviewer2.email!,
    });
    await createReview(buildReviewFormData(paper.id));

    bounty = await getBounty(paper.id);
    expect(bounty!.status).toBe("ACTIVE");
    expect(bounty!.payoutCount).toBe(0);

    // Review 3
    setAuthenticatedAs({
      id: reviewer3.id,
      name: reviewer3.name!,
      email: reviewer3.email!,
    });
    await createReview(buildReviewFormData(paper.id));

    // 3 qualifying reviews submitted — cool-off started, but not expired yet
    bounty = await getBounty(paper.id);
    expect(bounty!.status).toBe("ACTIVE");
    expect(bounty!.payoutCount).toBe(0);

    // Backdate cool-off and trigger acceptance
    const cooloffMs = REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_HOURS * 60 * 60 * 1000;
    await db.paper.update({
      where: { id: paper.id },
      data: { acceptanceEligibleAt: new Date(Date.now() - cooloffMs - 1000) },
    });
    await tryAcceptPaper(paper.id);

    // Bounty should be completed now (all 3 slots filled after cool-off)
    bounty = await getBounty(paper.id);
    expect(bounty!.status).toBe("COMPLETED");
    expect(bounty!.payoutCount).toBe(3);
  });

  it("should not create payout on paper without bounty", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    await addResearchAreas(reviewer.id, ["computer-science"]);

    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // No bounty on this paper

    setAuthenticatedAs({
      id: reviewer.id,
      name: reviewer.name!,
      email: reviewer.email!,
    });

    const result = await createReview(buildReviewFormData(paper.id));
    expect(result.success).toBe(true);

    // No payouts should exist
    const payouts = await db.bountyPayout.findMany({
      where: { recipientUserId: reviewer.id },
    });
    expect(payouts).toHaveLength(0);

    // No bounty reputation event
    const repEvents = await db.reputationEvent.findMany({
      where: { userId: reviewer.id, type: "BOUNTY_REVIEW_COMPLETED" },
    });
    expect(repEvents).toHaveLength(0);
  });

  it("should link review to payout via bountyPayoutId", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    await addResearchAreas(reviewer.id, ["computer-science"]);

    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    await db.bounty.create({
      data: {
        paperId: paper.id,
        totalAmountCents: 3000,
        reviewerPoolCents: 2700,
        platformFeeCents: 300,
        maxReviews: 2,
        status: "ACTIVE",
      },
    });

    setAuthenticatedAs({
      id: reviewer.id,
      name: reviewer.name!,
      email: reviewer.email!,
    });

    await createReview(buildReviewFormData(paper.id));

    // Payouts happen after cool-off — trigger directly to test mechanism
    const createdReview = await db.review.findFirst({
      where: { reviewerId: reviewer.id, paperId: paper.id },
      select: { id: true },
    });
    await processBountyPayout(paper.id, reviewer.id, createdReview!.id);

    // Review should be linked to payout
    const review = await db.review.findFirst({
      where: { reviewerId: reviewer.id, paperId: paper.id },
      select: { bountyPayoutId: true },
    });
    expect(review!.bountyPayoutId).not.toBeNull();

    const payout = await db.bountyPayout.findUnique({
      where: { id: review!.bountyPayoutId! },
    });
    expect(payout).not.toBeNull();
    expect(payout!.recipientUserId).toBe(reviewer.id);
  });
});
