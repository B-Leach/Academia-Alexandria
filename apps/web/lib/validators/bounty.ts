import { z } from "zod";
import { BOUNTY_DEFAULTS } from "@academia-alexandria/shared";

export const createBountySchema = z.object({
  paperId: z.string().min(1, "Paper ID is required"),
  perReviewCents: z.coerce
    .number()
    .int()
    .min(
      BOUNTY_DEFAULTS.MIN_PER_REVIEW_CENTS,
      `Minimum is $${BOUNTY_DEFAULTS.MIN_PER_REVIEW_CENTS / 100} per review`,
    )
    .max(
      BOUNTY_DEFAULTS.MAX_PER_REVIEW_CENTS,
      `Maximum is $${BOUNTY_DEFAULTS.MAX_PER_REVIEW_CENTS / 100} per review`,
    ),
  maxReviews: z.coerce
    .number()
    .int()
    .min(
      BOUNTY_DEFAULTS.MAX_REVIEWS,
      `Must be ${BOUNTY_DEFAULTS.MAX_REVIEWS} reviews`,
    )
    .max(
      BOUNTY_DEFAULTS.MAX_REVIEWS,
      `Must be ${BOUNTY_DEFAULTS.MAX_REVIEWS} reviews`,
    ),
});
