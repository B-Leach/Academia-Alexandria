import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";

// Mock Stripe module
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

import { processBountyPayout } from "@/lib/bounty-payout";
import { REPUTATION_POINTS } from "@academia-alexandria/shared";

beforeEach(() => {
  mockTransfersCreate.mockReset();
  mockAccountsRetrieve.mockReset();
});

const activeBounty = {
  id: "bounty-1",
  paperId: "paper-1",
  totalAmountCents: 5000,
  reviewerPoolCents: 4500,
  platformFeeCents: 500,
  currency: "usd",
  status: "ACTIVE",
  maxReviews: 2,
  _count: { payouts: 0 },
};

describe("processBountyPayout", () => {
  it("should return early when no active bounty exists", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bounty.findFirst.mockResolvedValue(null);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(mockTransfersCreate).not.toHaveBeenCalled();
    expect(prismaMock.bountyPayout.create).not.toHaveBeenCalled();
  });

  it("should return early when all bounty slots are filled", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bounty.findFirst.mockResolvedValue({
      ...activeBounty,
      _count: { payouts: 2 }, // maxReviews is 2
    } as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(mockTransfersCreate).not.toHaveBeenCalled();
    expect(prismaMock.bountyPayout.create).not.toHaveBeenCalled();
  });

  it("should create a Stripe transfer when reviewer has connected account", async () => {
    prismaMock.bounty.findFirst.mockResolvedValue(activeBounty as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: "acct_reviewer1",
    } as any);
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });
    mockTransfersCreate.mockResolvedValue({ id: "tr_123" });
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-1" } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(mockTransfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: Math.floor(4500 / 2), // reviewerPoolCents / maxReviews
        currency: "usd",
        destination: "acct_reviewer1",
        transfer_group: "bounty-1",
      }),
    );
  });

  it("should create payout record and update with transfer ID when paid", async () => {
    prismaMock.bounty.findFirst.mockResolvedValue(activeBounty as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: "acct_reviewer1",
    } as any);
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });
    mockTransfersCreate.mockResolvedValue({ id: "tr_123" });
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-1" } as any);
    prismaMock.bountyPayout.update.mockResolvedValue({} as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    // Payout created with null transfer ID inside transaction
    expect(prismaMock.bountyPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bountyId: "bounty-1",
          recipientUserId: "reviewer-1",
          amountCents: Math.floor(4500 / 2),
          stripeTransferId: null,
        }),
      }),
    );

    // Transfer ID set via update outside transaction
    expect(prismaMock.bountyPayout.update).toHaveBeenCalledWith({
      where: { id: "payout-1" },
      data: { stripeTransferId: "tr_123", paidAt: expect.any(Date) },
    });
  });

  it("should create pending payout when reviewer has no Stripe account", async () => {
    prismaMock.bounty.findFirst.mockResolvedValue(activeBounty as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-1" } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(mockTransfersCreate).not.toHaveBeenCalled();
    expect(prismaMock.bountyPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeTransferId: null,
          paidAt: null,
        }),
      }),
    );
  });

  it("should create pending payout when Stripe account is not charges_enabled", async () => {
    prismaMock.bounty.findFirst.mockResolvedValue(activeBounty as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: "acct_reviewer1",
    } as any);
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: false });
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-1" } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(mockTransfersCreate).not.toHaveBeenCalled();
  });

  it("should link review to payout", async () => {
    prismaMock.bounty.findFirst.mockResolvedValue(activeBounty as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-1" } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(prismaMock.review.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: { bountyPayoutId: "payout-1" },
    });
  });

  it("should award BOUNTY_REVIEW_COMPLETED reputation", async () => {
    prismaMock.bounty.findFirst.mockResolvedValue(activeBounty as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-1" } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(prismaMock.reputationEvent.create).toHaveBeenCalledWith({
      data: {
        userId: "reviewer-1",
        type: "BOUNTY_REVIEW_COMPLETED",
        points: REPUTATION_POINTS.BOUNTY_REVIEW_COMPLETED,
        sourcePaperId: "paper-1",
      },
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "reviewer-1" },
      data: {
        reputationScore: {
          increment: REPUTATION_POINTS.BOUNTY_REVIEW_COMPLETED,
        },
      },
    });
  });

  it("should complete bounty when all slots filled", async () => {
    // 1 existing payout + this one = 2 = maxReviews
    prismaMock.bounty.findFirst.mockResolvedValue({
      ...activeBounty,
      _count: { payouts: 1 },
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-2" } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.bounty.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    // Should mark bounty as COMPLETED
    expect(prismaMock.bounty.update).toHaveBeenCalledWith({
      where: { id: "bounty-1" },
      data: { status: "COMPLETED" },
    });
  });

  it("should NOT complete bounty when slots remain", async () => {
    // 0 existing + this = 1, maxReviews = 2
    prismaMock.bounty.findFirst.mockResolvedValue(activeBounty as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-1" } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(prismaMock.bounty.update).not.toHaveBeenCalled();
  });

  it("should calculate correct per-reviewer amount", async () => {
    // 4500 cents / 2 reviews = 2250 per reviewer
    prismaMock.bounty.findFirst.mockResolvedValue(activeBounty as any);
    prismaMock.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: "acct_r1",
    } as any);
    mockAccountsRetrieve.mockResolvedValue({ charges_enabled: true });
    mockTransfersCreate.mockResolvedValue({ id: "tr_456" });
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.bountyPayout.create.mockResolvedValue({ id: "payout-1" } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await processBountyPayout("paper-1", "reviewer-1", "review-1");

    expect(prismaMock.bountyPayout.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountCents: 2250,
        }),
      }),
    );
  });
});
