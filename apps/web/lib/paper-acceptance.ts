import { db } from "@/lib/db";
import { getAcceptanceReputationPoints } from "@/lib/reputation-logic";
import { notifyPaperAccepted } from "@/lib/email-notifications";
import { processBountyPayout } from "@/lib/bounty-payout";
import { REVIEW_DEFAULTS } from "@academia-alexandria/shared";
import { revalidatePath } from "next/cache";
import { isDoiEnabled, assignDoiToPaper } from "@/lib/crossref";
import { dispatchWebhooks } from "@/lib/webhooks";

/**
 * Evaluate paper for acceptance or rejection.
 * Cool-off starts when the outcome is determined:
 *   - Accept path: qualifying SOUND count >= threshold
 *   - Reject path: at least 1 qualifying UNSOUND review
 * After cool-off: pay all qualifying reviewers, then accept or reject.
 */
export async function tryAcceptPaper(paperId: string): Promise<void> {
  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      status: true,
      acceptanceEligibleAt: true,
      authors: { select: { userId: true } },
    },
  });

  if (!paper || paper.status !== "SUBMITTED") return;

  const reviews = await db.review.findMany({
    where: { paperId },
    select: {
      id: true,
      recommendation: true,
      isQualifying: true,
      reviewer: {
        select: {
          id: true,
          reputationScore: true,
        },
      },
    },
  });

  const qualifyingReviews = reviews.filter((r) => r.isQualifying);

  const soundCount = qualifyingReviews.filter(
    (r) => r.recommendation === "SOUND",
  ).length;
  const hasDissent = qualifyingReviews.some(
    (r) => r.recommendation !== "SOUND",
  );
  const thresholdMet = soundCount >= REVIEW_DEFAULTS.ACCEPTANCE_THRESHOLD;

  // Cool-off triggers when the outcome is determined
  if (!thresholdMet && !hasDissent) {
    // Not enough reviews to decide — clear any stale cool-off
    if (paper.acceptanceEligibleAt) {
      await db.paper.update({
        where: { id: paperId },
        data: { acceptanceEligibleAt: null },
      });
    }
    return;
  }

  // Pending reports on qualifying reviews pause the process
  const pendingReportCount = await db.report.count({
    where: {
      targetType: "REVIEW",
      targetId: { in: qualifyingReviews.map((r) => r.id) },
      status: "PENDING",
    },
  });
  if (pendingReportCount > 0) return;

  // Start cool-off if not already running
  if (!paper.acceptanceEligibleAt) {
    await db.paper.update({
      where: { id: paperId },
      data: { acceptanceEligibleAt: new Date() },
    });
    revalidatePath(`/papers/${paperId}`);
  }

  const eligibleAt = paper.acceptanceEligibleAt ?? new Date();
  const cooloffMs = REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_HOURS * 60 * 60 * 1000;
  if (Date.now() - eligibleAt.getTime() < cooloffMs) {
    return; // Still in cool-off period
  }

  // Cool-off expired — pay all qualifying reviewers regardless of outcome
  await processQualifyingPayouts(paperId);

  if (thresholdMet && !hasDissent) {
    await publishPaper(paperId, qualifyingReviews);
  }
  // Dissent: paper stays SUBMITTED — author can revise and resubmit
}

/** Promote paper to PUBLISHED, award reputation, process bounty payouts. */
export async function publishPaper(
  paperId: string,
  qualifyingReviews?: Array<{
    recommendation: string;
    reviewer: { id: string; reputationScore: number };
  }>,
): Promise<void> {
  if (!qualifyingReviews) {
    const paper = await db.paper.findUnique({
      where: { id: paperId },
      select: {
        status: true,
        authors: { select: { userId: true } },
      },
    });
    if (!paper || paper.status !== "SUBMITTED") return;

    const reviews = await db.review.findMany({
      where: { paperId, isQualifying: true },
      select: {
        id: true,
        recommendation: true,
        reviewer: {
          select: {
            id: true,
            reputationScore: true,
          },
        },
      },
    });

    qualifyingReviews = reviews;
  }

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      status: true,
      authors: { select: { userId: true } },
    },
  });
  if (!paper || paper.status !== "SUBMITTED") return;

  const avgReviewerRep =
    qualifyingReviews.reduce((sum, r) => sum + r.reviewer.reputationScore, 0) /
    qualifyingReviews.length;
  const points = getAcceptanceReputationPoints(avgReviewerRep);

  await db.$transaction(async (tx) => {
    await tx.paper.update({
      where: { id: paperId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    for (const author of paper.authors) {
      await tx.reputationEvent.create({
        data: {
          userId: author.userId,
          type: "PAPER_ACCEPTED",
          points,
          sourcePaperId: paperId,
        },
      });

      await tx.user.update({
        where: { id: author.userId },
        data: { reputationScore: { increment: points } },
      });
    }
  });

  notifyPaperAccepted(paperId, points).catch(() => {});
  dispatchWebhooks("paper.published", { paperId }).catch(() => {});

  if (isDoiEnabled()) {
    assignDoiToPaper(paperId).catch((err) => {
      console.error("DOI registration failed for paper", paperId, err);
    });
  }

  revalidatePath(`/papers/${paperId}`);
  revalidatePath("/papers");
  revalidatePath("/dashboard");
}

/** Process bounty payouts for all qualifying reviewers not yet paid (regardless of recommendation). */
async function processQualifyingPayouts(paperId: string): Promise<void> {
  const unpaidReviews = await db.review.findMany({
    where: { paperId, isQualifying: true, bountyPayoutId: null },
    select: { id: true, reviewerId: true },
  });

  for (const review of unpaidReviews) {
    try {
      await processBountyPayout(paperId, review.reviewerId, review.id);
    } catch (err) {
      console.error("Bounty payout failed for review", review.id, err);
    }
  }
}

/** Process papers past the cool-off cutoff. Called by cron. */
export async function processEligiblePapers(): Promise<number> {
  const cooloffMs = REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_HOURS * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - cooloffMs);

  const eligible = await db.paper.findMany({
    where: {
      status: "SUBMITTED",
      acceptanceEligibleAt: { not: null, lte: cutoff },
    },
    select: { id: true },
  });

  let published = 0;
  for (const paper of eligible) {
    try {
      await tryAcceptPaper(paper.id);
      const updated = await db.paper.findUnique({
        where: { id: paper.id },
        select: { status: true },
      });
      if (updated?.status === "PUBLISHED") published++;
    } catch (err) {
      console.error("Failed to publish paper", paper.id, err);
    }
  }

  return published;
}
