"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

/**
 * Fetch the bounty for a paper (public view — used on paper detail page).
 */
export async function getBounty(paperId: string) {
  const bounty = await db.bounty.findUnique({
    where: { paperId },
    select: {
      id: true,
      totalAmountCents: true,
      reviewerPoolCents: true,
      maxReviews: true,
      status: true,
      currency: true,
      expiresAt: true,
      createdAt: true,
      _count: { select: { payouts: true } },
    },
  });

  if (!bounty) return null;

  const perReviewerCents = Math.floor(
    bounty.reviewerPoolCents / bounty.maxReviews,
  );

  return {
    ...bounty,
    payoutCount: bounty._count.payouts,
    slotsRemaining: bounty.maxReviews - bounty._count.payouts,
    perReviewerCents,
  };
}

/**
 * Fetch pending (unclaimed) payouts for the current user.
 */
export async function getPendingPayouts() {
  const authResult = await requireUser();
  if (typeof authResult === "string")
    return { payouts: [], totalCents: 0, count: 0 };

  const payouts = await db.bountyPayout.findMany({
    where: {
      recipientUserId: authResult.id,
      stripeTransferId: null,
      paidAt: null,
    },
    select: {
      id: true,
      amountCents: true,
      createdAt: true,
      bounty: {
        select: {
          paper: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  const totalCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);

  return { payouts, totalCents, count: payouts.length };
}
