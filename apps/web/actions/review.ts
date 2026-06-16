"use server";

import { requireUser, requireOrcidUser } from "@/lib/require-user";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createReviewSchema } from "@/lib/validators/review";
import { isQualifyingReview } from "@/lib/review-logic";
import { REPUTATION_POINTS } from "@academia-alexandria/shared";
import { tryAcceptPaper } from "@/lib/paper-acceptance";
import { notifyReviewReceived } from "@/lib/email-notifications";
import { revalidatePath } from "next/cache";
import { rateLimitByUser } from "@/lib/rate-limit";
import { dispatchWebhooks } from "@/lib/webhooks";

export interface ReviewActionResult {
  error?: string;
  success?: boolean;
}

export async function createReview(
  formData: FormData,
): Promise<ReviewActionResult> {
  const authResult = await requireOrcidUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const raw = {
    paperId: formData.get("paperId") as string,
    methodologyScore: formData.get("methodologyScore") as string,
    noveltyScore: formData.get("noveltyScore") as string,
    clarityScore: formData.get("clarityScore") as string,
    reproducibilityScore: formData.get("reproducibilityScore") as string,
    ethicsScore: formData.get("ethicsScore") as string,
    summary: formData.get("summary") as string,
    strengthsText: formData.get("strengthsText") as string,
    weaknessesText: formData.get("weaknessesText") as string,
    detailedComments: formData.get("detailedComments") as string,
    recommendation: formData.get("recommendation") as string,
    confidenceLevel: formData.get("confidenceLevel") as string,
    conflictOfInterest: (formData.get("conflictOfInterest") as string) || "",
    isAnonymous: (formData.get("isAnonymous") as string) || "false",
  };

  const parsed = createReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  const paper = await db.paper.findUnique({
    where: { id: data.paperId },
    select: {
      id: true,
      status: true,
      disciplines: true,
      authors: { select: { userId: true } },
      bounty: { select: { status: true } },
    },
  });

  if (
    !paper ||
    (paper.status !== "SUBMITTED" && paper.status !== "PUBLISHED")
  ) {
    return { error: "Paper not found or not available for review" };
  }

  if (paper.authors.some((a) => a.userId === userId)) {
    return { error: "You cannot review your own paper" };
  }

  const existing = await db.review.findUnique({
    where: {
      paperId_reviewerId: { paperId: data.paperId, reviewerId: userId },
    },
  });
  if (existing) {
    return { error: "You have already reviewed this paper" };
  }

  const reviewerAreas = await db.userResearchArea.findMany({
    where: { userId },
    select: { researchArea: { select: { slug: true } } },
  });
  const reviewerSlugs = reviewerAreas.map((ra) => ra.researchArea.slug);
  const qualifying = isQualifyingReview(
    data.confidenceLevel,
    reviewerSlugs,
    paper.disciplines,
  );

  const review = await db.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        paperId: data.paperId,
        reviewerId: userId,
        methodologyScore: data.methodologyScore,
        noveltyScore: data.noveltyScore,
        clarityScore: data.clarityScore,
        reproducibilityScore: data.reproducibilityScore,
        ethicsScore: data.ethicsScore,
        summary: data.summary,
        strengthsText: data.strengthsText,
        weaknessesText: data.weaknessesText,
        detailedComments: data.detailedComments,
        recommendation: data.recommendation,
        confidenceLevel: data.confidenceLevel,
        conflictOfInterest: data.conflictOfInterest || null,
        isAnonymous: data.isAnonymous,
        isQualifying: qualifying,
      },
      select: { id: true },
    });

    await tx.paper.update({
      where: { id: data.paperId },
      data: { reviewCount: { increment: 1 } },
    });

    if (qualifying) {
      await tx.reputationEvent.create({
        data: {
          userId,
          type: "REVIEW_SUBMITTED",
          points: REPUTATION_POINTS.REVIEW_SUBMITTED,
          sourcePaperId: data.paperId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          reputationScore: { increment: REPUTATION_POINTS.REVIEW_SUBMITTED },
        },
      });
    }

    return created;
  });

  notifyReviewReceived(data.paperId, "A reviewer", data.recommendation).catch(
    () => {},
  );
  dispatchWebhooks("review.submitted", { paperId: data.paperId, reviewId: review.id }).catch(() => {});

  if (paper.status === "SUBMITTED") {
    await tryAcceptPaper(data.paperId);
  }

  revalidatePath(`/papers/${data.paperId}`);

  return { success: true };
}

export async function editReview(
  reviewId: string,
  formData: FormData,
): Promise<ReviewActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      reviewerId: true,
      paperId: true,
      recommendation: true,
      paper: { select: { status: true, acceptanceEligibleAt: true } },
    },
  });

  if (!review) {
    return { error: "Review not found" };
  }

  if (review.reviewerId !== userId) {
    return { error: "You can only edit your own reviews" };
  }

  if (
    review.paper.status === "PUBLISHED" ||
    review.paper.status === "RETRACTED"
  ) {
    return { error: "Reviews on published papers cannot be edited" };
  }

  const raw = {
    paperId: review.paperId,
    methodologyScore: formData.get("methodologyScore") as string,
    noveltyScore: formData.get("noveltyScore") as string,
    clarityScore: formData.get("clarityScore") as string,
    reproducibilityScore: formData.get("reproducibilityScore") as string,
    ethicsScore: formData.get("ethicsScore") as string,
    summary: formData.get("summary") as string,
    strengthsText: formData.get("strengthsText") as string,
    weaknessesText: formData.get("weaknessesText") as string,
    detailedComments: formData.get("detailedComments") as string,
    recommendation: formData.get("recommendation") as string,
    confidenceLevel: formData.get("confidenceLevel") as string,
    conflictOfInterest: (formData.get("conflictOfInterest") as string) || "",
  };

  const parsed = createReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  await db.review.update({
    where: { id: reviewId },
    data: {
      methodologyScore: data.methodologyScore,
      noveltyScore: data.noveltyScore,
      clarityScore: data.clarityScore,
      reproducibilityScore: data.reproducibilityScore,
      ethicsScore: data.ethicsScore,
      summary: data.summary,
      strengthsText: data.strengthsText,
      weaknessesText: data.weaknessesText,
      detailedComments: data.detailedComments,
      recommendation: data.recommendation,
      confidenceLevel: data.confidenceLevel,
      conflictOfInterest: data.conflictOfInterest || null,
      editedAt: new Date(),
    },
  });

  if (
    review.paper.status === "SUBMITTED" &&
    data.recommendation !== review.recommendation &&
    review.paper.acceptanceEligibleAt
  ) {
    await db.paper.update({
      where: { id: review.paperId },
      data: { acceptanceEligibleAt: null },
    });
  }

  if (review.paper.status === "SUBMITTED") {
    await tryAcceptPaper(review.paperId);
  }

  revalidatePath(`/papers/${review.paperId}`);

  return { success: true };
}

export async function deleteReview(
  reviewId: string,
): Promise<ReviewActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      reviewerId: true,
      paperId: true,
      isQualifying: true,
      paper: {
        select: {
          status: true,
          acceptanceEligibleAt: true,
        },
      },
    },
  });

  if (!review) {
    return { error: "Review not found" };
  }

  if (review.reviewerId !== userId) {
    return { error: "You can only delete your own reviews" };
  }

  if (review.paper.status !== "SUBMITTED") {
    return {
      error: "Reviews can only be deleted while the paper is submitted",
    };
  }

  const wasQualifying = review.isQualifying;

  await db.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });

    await tx.paper.update({
      where: { id: review.paperId },
      data: {
        reviewCount: { decrement: 1 },
        ...(review.paper.acceptanceEligibleAt
          ? { acceptanceEligibleAt: null }
          : {}),
      },
    });

    if (wasQualifying) {
      const repEvent = await tx.reputationEvent.findFirst({
        where: {
          userId,
          type: "REVIEW_SUBMITTED",
          sourcePaperId: review.paperId,
        },
      });
      if (repEvent) {
        await tx.reputationEvent.delete({ where: { id: repEvent.id } });
        const reviewer = await tx.user.findUnique({
          where: { id: userId },
          select: { reputationScore: true },
        });
        const newScore = Math.max(
          0,
          (reviewer?.reputationScore ?? 0) - REPUTATION_POINTS.REVIEW_SUBMITTED,
        );
        await tx.user.update({
          where: { id: userId },
          data: { reputationScore: newScore },
        });
      }
    }
  });

  await tryAcceptPaper(review.paperId);

  revalidatePath(`/papers/${review.paperId}`);

  return { success: true };
}

export async function getReviews(paperId: string) {
  // Derive viewer identity from session — never trust client params
  const session = await auth();
  const currentUserId = session?.user?.id;
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";

  const reviews = await db.review.findMany({
    where: { paperId },
    select: {
      id: true,
      methodologyScore: true,
      noveltyScore: true,
      clarityScore: true,
      reproducibilityScore: true,
      ethicsScore: true,
      summary: true,
      strengthsText: true,
      weaknessesText: true,
      detailedComments: true,
      recommendation: true,
      confidenceLevel: true,
      conflictOfInterest: true,
      isAnonymous: true,
      isQualifying: true,
      createdAt: true,
      editedAt: true,
      reviewer: {
        select: {
          id: true,
          name: true,
          honorific: true,
          avatarUrl: true,
          reputationScore: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Mask reviewer identity for anonymous reviews unless viewer is the reviewer or an admin
  return reviews.map((review) => {
    const shouldMask =
      review.isAnonymous && review.reviewer.id !== currentUserId && !isAdmin;

    return {
      ...review,
      reviewer: shouldMask
        ? {
            id: "anonymous",
            name: "Anonymous Reviewer",
            honorific: null,
            avatarUrl: null,
            reputationScore: 0,
          }
        : {
            id: review.reviewer.id,
            name: review.reviewer.name,
            honorific: review.reviewer.honorific,
            avatarUrl: review.reviewer.avatarUrl,
            reputationScore: review.reviewer.reputationScore,
          },
    };
  });
}
