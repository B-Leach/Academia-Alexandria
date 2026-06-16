import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, isStripeEnabled } from "@/lib/stripe";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isStripeEnabled()) {
    return NextResponse.json(
      { error: "Payments are not configured" },
      { status: 503 },
    );
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
    select: { stripeConnectAccountId: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let accountId = user.stripeConnectAccountId;

  // Create a new Connect account if user doesn't have one
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "standard",
      email: user.email ?? undefined,
    });

    accountId = account.id;

    await db.user.update({
      where: { id: session.user.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  // Create an account link for onboarding/re-onboarding
  const baseUrl = getBaseUrl();
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/settings?stripe=refresh`,
    return_url: `${baseUrl}/settings?stripe=connected`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
