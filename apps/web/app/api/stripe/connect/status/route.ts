import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, isStripeEnabled } from "@/lib/stripe";
import { checkApiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isStripeEnabled()) {
    return NextResponse.json({ enabled: false });
  }

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
    return NextResponse.json({ enabled: true, connected: false });
  }

  try {
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    // Fetch pending (unclaimed) payouts
    const pendingPayoutAgg = await db.bountyPayout.aggregate({
      where: {
        recipientUserId: session.user.id,
        stripeTransferId: null,
        paidAt: null,
      },
      _count: true,
      _sum: { amountCents: true },
    });

    return NextResponse.json({
      enabled: true,
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      pendingPayouts: {
        count: pendingPayoutAgg._count,
        totalCents: pendingPayoutAgg._sum.amountCents ?? 0,
      },
    });
  } catch {
    // Account may have been deleted on Stripe's end
    return NextResponse.json({ enabled: true, connected: false });
  }
}
