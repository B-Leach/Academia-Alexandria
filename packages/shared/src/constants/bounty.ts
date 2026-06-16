import { REVIEW_DEFAULTS } from "./review";

export const BOUNTY_SPLIT = {
  REVIEWER_PERCENT: 90,
  PLATFORM_PERCENT: 10,
} as const;

export const BOUNTY_DEFAULTS = {
  MAX_REVIEWS: REVIEW_DEFAULTS.ACCEPTANCE_THRESHOLD,
  MIN_PER_REVIEW_CENTS: 500, // $5 minimum per review
  MAX_PER_REVIEW_CENTS: 30000, // $300 maximum per review
  SUGGESTED_MIN_PER_REVIEW_CENTS: 1500, // $15 suggested minimum
  SUGGESTED_MAX_PER_REVIEW_CENTS: 10000, // $100 suggested maximum
} as const;

/** Calculate total bounty cost from a per-review amount. */
export function calculateBountyFromPerReview(
  perReviewCents: number,
  maxReviews: number = BOUNTY_DEFAULTS.MAX_REVIEWS,
) {
  const reviewerPoolCents = perReviewCents * maxReviews;
  const totalAmountCents = Math.ceil(
    (reviewerPoolCents * 100) / BOUNTY_SPLIT.REVIEWER_PERCENT,
  );
  const platformFeeCents = totalAmountCents - reviewerPoolCents;

  return { totalAmountCents, reviewerPoolCents, platformFeeCents };
}
