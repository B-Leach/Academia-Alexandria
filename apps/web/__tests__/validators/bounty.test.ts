import { describe, it, expect } from "vitest";
import { createBountySchema } from "@/lib/validators/bounty";
import { BOUNTY_DEFAULTS } from "@academia-alexandria/shared";

describe("createBountySchema", () => {
  const valid = {
    paperId: "paper-1",
    perReviewCents: 5000,
    maxReviews: BOUNTY_DEFAULTS.MAX_REVIEWS,
  };

  it("should accept valid bounty data", () => {
    const result = createBountySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should accept minimum amount", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      perReviewCents: BOUNTY_DEFAULTS.MIN_PER_REVIEW_CENTS,
    });
    expect(result.success).toBe(true);
  });

  it("should accept maximum amount", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      perReviewCents: BOUNTY_DEFAULTS.MAX_PER_REVIEW_CENTS,
    });
    expect(result.success).toBe(true);
  });

  it("should reject amount below minimum", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      perReviewCents: BOUNTY_DEFAULTS.MIN_PER_REVIEW_CENTS - 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject amount above maximum", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      perReviewCents: BOUNTY_DEFAULTS.MAX_PER_REVIEW_CENTS + 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer amount", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      perReviewCents: 50.5,
    });
    expect(result.success).toBe(false);
  });

  it("should coerce string amounts to numbers", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      perReviewCents: "5000",
      maxReviews: String(BOUNTY_DEFAULTS.MAX_REVIEWS),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.perReviewCents).toBe(5000);
      expect(result.data.maxReviews).toBe(BOUNTY_DEFAULTS.MAX_REVIEWS);
    }
  });

  it("should reject empty paperId", () => {
    const result = createBountySchema.safeParse({ ...valid, paperId: "" });
    expect(result.success).toBe(false);
  });

  it("should accept maxReviews equal to acceptance threshold", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      maxReviews: BOUNTY_DEFAULTS.MAX_REVIEWS,
    });
    expect(result.success).toBe(true);
  });

  it("should reject maxReviews below acceptance threshold", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      maxReviews: BOUNTY_DEFAULTS.MAX_REVIEWS - 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxReviews above acceptance threshold", () => {
    const result = createBountySchema.safeParse({
      ...valid,
      maxReviews: BOUNTY_DEFAULTS.MAX_REVIEWS + 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxReviews of 0", () => {
    const result = createBountySchema.safeParse({ ...valid, maxReviews: 0 });
    expect(result.success).toBe(false);
  });
});
