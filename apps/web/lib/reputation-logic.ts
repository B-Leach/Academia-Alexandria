import { REPUTATION_POINTS } from "@academia-alexandria/shared";

/**
 * Determine how many reputation points to award authors when a paper
 * is accepted, based on the average reputation of qualifying reviewers.
 */
export function getAcceptanceReputationPoints(avgReviewerRep: number): number {
  if (avgReviewerRep >= 500) return REPUTATION_POINTS.PAPER_ACCEPTED_HIGH;
  if (avgReviewerRep >= 100) return REPUTATION_POINTS.PAPER_ACCEPTED_MID;
  return REPUTATION_POINTS.PAPER_ACCEPTED_LOW;
}
