"use server";

import { requireUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import { rateLimitByUser } from "@/lib/rate-limit";
import { notifyCoAuthorResponse } from "@/lib/email-notifications";
import { revalidatePath } from "next/cache";

interface InvitationActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Fetch pending co-author invitations for the current user.
 */
export async function getMyInvitations() {
  const authResult = await requireUser();
  if (typeof authResult === "string") return [];

  const invitations = await db.coAuthorInvitation.findMany({
    where: {
      inviteeId: authResult.id,
      status: "PENDING",
    },
    select: {
      id: true,
      createdAt: true,
      paper: {
        select: {
          id: true,
          title: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations;
}

/**
 * Accept or decline a co-author invitation.
 */
export async function respondToInvitation(
  invitationId: string,
  accept: boolean,
): Promise<InvitationActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;

  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const invitation = await db.coAuthorInvitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      paperId: true,
      inviterId: true,
      inviteeId: true,
      status: true,
      order: true,
      invitee: { select: { name: true } },
      paper: { select: { status: true } },
    },
  });

  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (invitation.inviteeId !== userId) {
    return { error: "This invitation is not for you" };
  }

  if (invitation.status !== "PENDING") {
    return { error: "This invitation has already been responded to" };
  }

  if (accept && invitation.paper.status !== "DRAFT") {
    return { error: "This paper has already been submitted and can no longer accept new authors" };
  }

  if (accept) {
    // Check if user is already an author (e.g. race condition with duplicate accept)
    const existingAuthor = await db.paperAuthor.findUnique({
      where: { paperId_userId: { paperId: invitation.paperId, userId } },
    });
    if (existingAuthor) {
      await db.coAuthorInvitation.update({
        where: { id: invitationId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
    } else {
      await db.$transaction([
        db.paperAuthor.create({
          data: {
            paperId: invitation.paperId,
            userId,
            order: invitation.order,
            isCorresponding: false,
          },
        }),
        db.coAuthorInvitation.update({
          where: { id: invitationId },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        }),
      ]);
    }
  } else {
    await db.coAuthorInvitation.update({
      where: { id: invitationId },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
  }

  // Fire-and-forget notification to inviter
  notifyCoAuthorResponse(
    invitation.inviterId,
    invitation.paperId,
    invitation.invitee.name,
    accept,
  ).catch(() => {});

  revalidatePath("/dashboard");
  revalidatePath(`/papers/${invitation.paperId}`);

  return { success: true };
}
