import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, isStripeEnabled } from "@/lib/stripe";
import { createBountySchema } from "@/lib/validators/bounty";
import { calculateBountyFromPerReview } from "@academia-alexandria/shared";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email address before creating a bounty" },
      { status: 403 },
    );
  }
  const limited = await checkApiRateLimit("stripe", session.user.id);
  if (limited) return limited;

  const body = await request.json();
  const parsed = createBountySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const { paperId, perReviewCents, maxReviews } = parsed.data;

  // Verify user is an author of this paper
  const authorLink = await db.paperAuthor.findUnique({
    where: { paperId_userId: { paperId, userId: session.user.id } },
    include: {
      paper: { select: { title: true, status: true } },
    },
  });

  if (!authorLink) {
    return NextResponse.json(
      { error: "You are not an author of this paper" },
      { status: 403 },
    );
  }

  if (
    authorLink.paper.status !== "SUBMITTED" &&
    authorLink.paper.status !== "PUBLISHED"
  ) {
    return NextResponse.json(
      { error: "Paper must be submitted or published to add a bounty" },
      { status: 400 },
    );
  }

  // Check for existing active bounty
  const existingBounty = await db.bounty.findUnique({
    where: { paperId },
  });

  if (existingBounty && existingBounty.status === "ACTIVE") {
    return NextResponse.json(
      { error: "This paper already has an active bounty" },
      { status: 400 },
    );
  }

  const split = calculateBountyFromPerReview(perReviewCents, maxReviews);
  const baseUrl = getBaseUrl();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: split.totalAmountCents,
          product_data: {
            name: "Peer Review Bounty",
            description: `$${(perReviewCents / 100).toFixed(2)} per review × ${maxReviews} reviews for "${authorLink.paper.title}"`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      paperId,
      userId: session.user.id,
      amountCents: String(split.totalAmountCents),
      maxReviews: String(maxReviews),
      reviewerPoolCents: String(split.reviewerPoolCents),
      platformFeeCents: String(split.platformFeeCents),
    },
    success_url: `${baseUrl}/papers/${paperId}?bounty=created`,
    cancel_url: `${baseUrl}/papers/${paperId}`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
