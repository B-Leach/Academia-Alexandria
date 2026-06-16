import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import "../helpers/mock-auth";
import { setAuthenticated } from "../helpers/mock-auth";

import {
  getBounty,
  getPendingPayouts,
} from "@/actions/bounty";

beforeEach(() => {
  setAuthenticated();
});

describe("getBounty", () => {
  it("should return null when no bounty exists", async () => {
    prismaMock.bounty.findUnique.mockResolvedValue(null);

    const result = await getBounty("paper-1");
    expect(result).toBeNull();
  });

  it("should return bounty with computed fields", async () => {
    prismaMock.bounty.findUnique.mockResolvedValue({
      id: "bounty-1",
      totalAmountCents: 5000,
      reviewerPoolCents: 4250,
      maxReviews: 2,
      status: "ACTIVE",
      currency: "usd",
      expiresAt: null,
      createdAt: new Date("2026-01-01"),
      _count: { payouts: 1 },
    } as any);

    const result = await getBounty("paper-1");

    expect(result).not.toBeNull();
    expect(result!.payoutCount).toBe(1);
    expect(result!.slotsRemaining).toBe(1);
    expect(result!.perReviewerCents).toBe(Math.floor(4250 / 2));
  });

  it("should calculate zero slots remaining when full", async () => {
    prismaMock.bounty.findUnique.mockResolvedValue({
      id: "bounty-1",
      totalAmountCents: 5000,
      reviewerPoolCents: 4250,
      maxReviews: 3,
      status: "COMPLETED",
      currency: "usd",
      expiresAt: null,
      createdAt: new Date("2026-01-01"),
      _count: { payouts: 3 },
    } as any);

    const result = await getBounty("paper-1");

    expect(result!.slotsRemaining).toBe(0);
    expect(result!.payoutCount).toBe(3);
  });
});

describe("getPendingPayouts", () => {
  it("should return empty when not authenticated", async () => {
    const { setUnauthenticated } = await import("../helpers/mock-auth");
    setUnauthenticated();

    const result = await getPendingPayouts();

    expect(result.count).toBe(0);
    expect(result.totalCents).toBe(0);
    expect(result.payouts).toHaveLength(0);
  });

  it("should return empty when no pending payouts", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ bannedAt: null } as any);
    prismaMock.bountyPayout.findMany.mockResolvedValue([]);

    const result = await getPendingPayouts();

    expect(result.count).toBe(0);
    expect(result.totalCents).toBe(0);
    expect(result.payouts).toHaveLength(0);
  });

  it("should return pending payouts with totals", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ bannedAt: null } as any);
    prismaMock.bountyPayout.findMany.mockResolvedValue([
      {
        id: "payout-1",
        amountCents: 2125,
        createdAt: new Date(),
        bounty: { paper: { id: "paper-1", title: "Test Paper" } },
      },
      {
        id: "payout-2",
        amountCents: 1500,
        createdAt: new Date(),
        bounty: { paper: { id: "paper-2", title: "Another Paper" } },
      },
    ] as any);

    const result = await getPendingPayouts();

    expect(result.count).toBe(2);
    expect(result.totalCents).toBe(3625);
    expect(result.payouts).toHaveLength(2);
  });
});
