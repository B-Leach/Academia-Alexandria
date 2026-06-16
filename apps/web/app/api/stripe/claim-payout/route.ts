import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { checkApiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.banned) {
    return NextResponse.json(
      { error: "Your account has been suspended" },
      { status: 403 },
    );
  }
  const limited = await checkApiRateLimit("stripe", session.user.id);
  if (limited) return limited;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (!user?.stripeConnectAccountId) {
    return NextResponse.json(
      { error: "You must connect a Stripe account first" },
      { status: 400 },
    );
  }

  // Verify account can receive transfers
  const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
  if (!account.charges_enabled) {
    return NextResponse.json(
      { error: "Your Stripe account is not fully verified yet" },
      { status: 400 },
    );
  }

  // Find all unclaimed payouts for this user
  const pendingPayouts = await db.bountyPayout.findMany({
    where: {
      recipientUserId: session.user.id,
      stripeTransferId: null,
      paidAt: null,
    },
    include: {
      bounty: { select: { id: true, currency: true } },
    },
  });

  if (pendingPayouts.length === 0) {
    return NextResponse.json({ claimed: 0, totalCents: 0 });
  }

  let claimed = 0;
  let totalCents = 0;

  for (const payout of pendingPayouts) {
    try {
      const transfer = await stripe.transfers.create({
        amount: payout.amountCents,
        currency: payout.bounty.currency,
        destination: user.stripeConnectAccountId,
        transfer_group: payout.bounty.id,
        metadata: {
          bountyPayoutId: payout.id,
          bountyId: payout.bounty.id,
        },
      });

      await db.bountyPayout.update({
        where: { id: payout.id },
        data: {
          stripeTransferId: transfer.id,
          paidAt: new Date(),
        },
      });

      claimed++;
      totalCents += payout.amountCents;
    } catch (err) {
      console.error(`Failed to claim payout ${payout.id}:`, err);
      // Continue with remaining payouts
    }
  }

  return NextResponse.json({ claimed, totalCents });
}
