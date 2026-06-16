import { describe, it, expect } from "vitest";
import { calculateBountyFromPerReview } from "../bounty";

describe("calculateBountyFromPerReview", () => {
  it("should calculate from $15 per review with 3 reviews", () => {
    const result = calculateBountyFromPerReview(1500, 3);
    expect(result.reviewerPoolCents).toBe(4500);
    // Total = 4500 / 0.9 = 5000
    expect(result.totalAmountCents).toBe(5000);
    expect(result.platformFeeCents).toBe(500);
  });

  it("should ensure reviewer pool equals perReview * maxReviews", () => {
    const result = calculateBountyFromPerReview(2000, 3);
    expect(result.reviewerPoolCents).toBe(6000);
  });

  it("should ensure total = reviewerPool + platformFee", () => {
    for (const perReview of [500, 1500, 5000, 10000, 30000]) {
      const result = calculateBountyFromPerReview(perReview, 3);
      expect(result.reviewerPoolCents + result.platformFeeCents).toBe(
        result.totalAmountCents,
      );
    }
  });
});
