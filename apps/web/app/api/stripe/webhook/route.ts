import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      await handleCheckoutCompleted(event.data.object);
      break;
    }
    default:
      // Ignore unhandled event types
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata;
  if (!metadata?.paperId) return;

  const paymentIntentId =
    (session.payment_intent as string | undefined) ?? session.id;

  // Idempotency: check if bounty already exists for this payment
  const existing = await db.bounty.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (existing) return;

  const paperId = metadata.paperId;
  const totalAmountCents = parseInt(metadata.amountCents, 10);
  const maxReviews = parseInt(metadata.maxReviews, 10);
  const reviewerPoolCents = parseInt(metadata.reviewerPoolCents, 10);
  const platformFeeCents = parseInt(metadata.platformFeeCents, 10);

  if (
    !paperId ||
    isNaN(totalAmountCents) || totalAmountCents <= 0 ||
    isNaN(maxReviews) || maxReviews <= 0 ||
    isNaN(reviewerPoolCents) || reviewerPoolCents < 0 ||
    isNaN(platformFeeCents) || platformFeeCents < 0
  ) {
    console.error("Invalid bounty metadata from Stripe:", metadata);
    return;
  }

  // Delete any expired/completed bounty on this paper before creating new one
  await db.bounty.deleteMany({
    where: {
      paperId,
      status: { in: ["EXPIRED", "COMPLETED"] },
    },
  });

  await db.bounty.create({
    data: {
      paperId,
      totalAmountCents,
      reviewerPoolCents,
      platformFeeCents,
      maxReviews,
      status: "ACTIVE",
      stripePaymentIntentId: paymentIntentId ?? null,
    },
  });
}
