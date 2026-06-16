"use server";

import { requireUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import { createEndorsementSchema } from "@/lib/validators/endorsement";
import {
  REPUTATION_POINTS,
  REPUTATION_THRESHOLDS,
} from "@academia-alexandria/shared";
import { notifyEndorsementReceived } from "@/lib/email-notifications";
import { revalidatePath } from "next/cache";
import { rateLimitByUser } from "@/lib/rate-limit";
import { dispatchWebhooks } from "@/lib/webhooks";

export interface EndorsementActionResult {
  error?: string;
  success?: boolean;
}

export async function createEndorsement(
  formData: FormData,
): Promise<EndorsementActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const raw = {
    paperId: formData.get("paperId") as string,
    statement: (formData.get("statement") as string) || undefined,
    conflictOfInterest: (formData.get("conflictOfInterest") as string) || "",
  };

  const parsed = createEndorsementSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  const endorser = await db.user.findUnique({
    where: { id: userId },
    select: { reputationScore: true },
  });

  if (
    !endorser ||
    endorser.reputationScore < REPUTATION_THRESHOLDS.CAN_ENDORSE
  ) {
    return {
      error: `You need at least ${REPUTATION_THRESHOLDS.CAN_ENDORSE} reputation to endorse papers`,
    };
  }

  const paper = await db.paper.findUnique({
    where: { id: data.paperId },
    select: {
      id: true,
      status: true,
      authors: { select: { userId: true } },
    },
  });

  if (!paper || paper.status !== "PUBLISHED") {
    return { error: "Paper not found or not published" };
  }

  if (paper.authors.some((a) => a.userId === userId)) {
    return { error: "You cannot endorse your own paper" };
  }

  const existing = await db.endorsement.findUnique({
    where: {
      paperId_endorserId: { paperId: data.paperId, endorserId: userId },
    },
  });
  if (existing) {
    return { error: "You have already endorsed this paper" };
  }

  const isTrusted =
    endorser.reputationScore >= REPUTATION_THRESHOLDS.TRUSTED_REVIEWER;
  const authorRepType = isTrusted
    ? "PAPER_ENDORSED_BY_TRUSTED"
    : "ENDORSEMENT_RECEIVED";
  const authorRepPoints = isTrusted
    ? REPUTATION_POINTS.PAPER_ENDORSED_BY_TRUSTED
    : REPUTATION_POINTS.ENDORSEMENT_RECEIVED;

  await db.$transaction(async (tx) => {
    await tx.endorsement.create({
      data: {
        paperId: data.paperId,
        endorserId: userId,
        statement: data.statement || null,
        conflictOfInterest: data.conflictOfInterest || null,
      },
    });

    await tx.paper.update({
      where: { id: data.paperId },
      data: { endorsementCount: { increment: 1 } },
    });

    // Award reputation to each paper author
    for (const author of paper.authors) {
      await tx.reputationEvent.create({
        data: {
          userId: author.userId,
          type: authorRepType,
          points: authorRepPoints,
          sourcePaperId: data.paperId,
        },
      });

      await tx.user.update({
        where: { id: author.userId },
        data: { reputationScore: { increment: authorRepPoints } },
      });
    }

    // Award +1 to endorser
    await tx.reputationEvent.create({
      data: {
        userId,
        type: "ENDORSEMENT_GIVEN",
        points: REPUTATION_POINTS.ENDORSEMENT_GIVEN,
        sourcePaperId: data.paperId,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        reputationScore: { increment: REPUTATION_POINTS.ENDORSEMENT_GIVEN },
      },
    });
  });

  // Send email notification (fire-and-forget)
  notifyEndorsementReceived(data.paperId, userId).catch(() => {});
  dispatchWebhooks("endorsement.received", { paperId: data.paperId }).catch(() => {});

  revalidatePath(`/papers/${data.paperId}`);

  return { success: true };
}

export async function getEndorsements(paperId: string) {
  const endorsements = await db.endorsement.findMany({
    where: { paperId },
    select: {
      id: true,
      statement: true,
      conflictOfInterest: true,
      createdAt: true,
      endorser: {
        select: {
          id: true,
          name: true,
          honorific: true,
          avatarUrl: true,
          reputationScore: true,
          institution: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return endorsements;
}
