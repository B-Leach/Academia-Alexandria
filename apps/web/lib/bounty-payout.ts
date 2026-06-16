import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { REPUTATION_POINTS } from "@academia-alexandria/shared";
import { notifyBountyPayout } from "@/lib/email-notifications";

/**
 * Process a bounty payout for a qualifying review. Uses a serializable
 * transaction for slot allocation, with Stripe calls outside to avoid
 * holding DB locks during network I/O.
 */
export async function processBountyPayout(
  paperId: string,
  reviewerId: string,
  reviewId: string,
): Promise<void> {
  const result = await db.$transaction(
    async (tx) => {
      const bounty = await tx.bounty.findFirst({
        where: { paperId, status: "ACTIVE" },
        include: { _count: { select: { payouts: true } } },
      });

      if (!bounty) return null;

      if (bounty._count.payouts >= bounty.maxReviews) return null;

      const perReviewerCents = Math.floor(
        bounty.reviewerPoolCents / bounty.maxReviews,
      );

      const reviewer = await tx.user.findUnique({
        where: { id: reviewerId },
        select: { stripeConnectAccountId: true },
      });

      const payout = await tx.bountyPayout.create({
        data: {
          bountyId: bounty.id,
          recipientUserId: reviewerId,
          amountCents: perReviewerCents,
          stripeTransferId: null,
          paidAt: null,
        },
      });

      await tx.review.update({
        where: { id: reviewId },
        data: { bountyPayoutId: payout.id },
      });

      await tx.reputationEvent.create({
        data: {
          userId: reviewerId,
          type: "BOUNTY_REVIEW_COMPLETED",
          points: REPUTATION_POINTS.BOUNTY_REVIEW_COMPLETED,
          sourcePaperId: paperId,
        },
      });

      await tx.user.update({
        where: { id: reviewerId },
        data: {
          reputationScore: {
            increment: REPUTATION_POINTS.BOUNTY_REVIEW_COMPLETED,
          },
        },
      });

      const totalPayouts = bounty._count.payouts + 1;
      if (totalPayouts >= bounty.maxReviews) {
        await tx.bounty.update({
          where: { id: bounty.id },
          data: { status: "COMPLETED" },
        });
      }

      return {
        payout,
        reviewer,
        bounty,
        perReviewerCents,
      };
    },
    { isolationLevel: "Serializable" },
  );

  if (!result) return;

  const { payout, reviewer, bounty, perReviewerCents } = result;

  if (reviewer?.stripeConnectAccountId) {
    try {
      const account = await stripe.accounts.retrieve(
        reviewer.stripeConnectAccountId,
      );

      if (account.charges_enabled) {
        const transfer = await stripe.transfers.create({
          amount: perReviewerCents,
          currency: bounty.currency,
          destination: reviewer.stripeConnectAccountId,
          transfer_group: bounty.id,
          metadata: {
            bountyId: bounty.id,
            reviewId,
            reviewerId,
            paperId,
          },
        });

        await db.bountyPayout.update({
          where: { id: payout.id },
          data: { stripeTransferId: transfer.id, paidAt: new Date() },
        });
      }
    } catch (err) {
      console.error(
        "Stripe transfer failed (payout record saved as pending):",
        err,
      );
    }
  }

  notifyBountyPayout(
    reviewerId,
    paperId,
    perReviewerCents,
    !reviewer?.stripeConnectAccountId,
  ).catch(() => {});
}
