import { db } from "@/lib/db";
import {
  isEmailEnabled,
  sendEmail,
  WelcomeEmail,
  ReviewReceivedEmail,
  CommentReceivedEmail,
  EndorsementReceivedEmail,
  PaperAcceptedEmail,
  BountyPayoutEmail,
  CoAuthorInvitationEmail,
  CoAuthorResponseEmail,
} from "@academia-alexandria/email";
import {
  getUnsubscribeToken,
  buildUnsubscribeUrl,
  type PrefKey,
} from "@/lib/unsubscribe";
import { getBaseUrl } from "@/lib/utils";

function getSettingsUrl(): string {
  return `${getBaseUrl()}/settings`;
}

/**
 * Build unsubscribe URL and List-Unsubscribe headers for a user/preference pair.
 */
async function buildUnsubscribeInfo(
  userId: string,
  prefKey: PrefKey,
  existingToken?: string | null,
) {
  const token = existingToken || (await getUnsubscribeToken(userId));
  const unsubscribeUrl = buildUnsubscribeUrl(userId, prefKey, token);
  const headers = {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  return { unsubscribeUrl, headers };
}

/**
 * Send a welcome email to a newly registered user.
 * No preference check — always sent on registration.
 */
export async function notifyWelcome(userId: string): Promise<void> {
  if (!isEmailEnabled()) return;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user) return;

    await sendEmail({
      to: user.email,
      subject: "Welcome to Academia Alexandria",
      react: WelcomeEmail({
        name: user.name,
        dashboardUrl: `${getBaseUrl()}/dashboard`,
      }),
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}

/**
 * Notify paper authors that their paper received a new review.
 */
export async function notifyReviewReceived(
  paperId: string,
  reviewerName: string,
  recommendation: string,
): Promise<void> {
  if (!isEmailEnabled()) return;

  try {
    const paper = await db.paper.findUnique({
      where: { id: paperId },
      select: {
        title: true,
        authors: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                notifyReviews: true,
                unsubscribeToken: true,
              },
            },
          },
        },
      },
    });
    if (!paper) return;

    const paperUrl = `${getBaseUrl()}/papers/${paperId}`;
    const settingsUrl = getSettingsUrl();

    for (const { user } of paper.authors) {
      if (!user.notifyReviews) continue;

      const { unsubscribeUrl, headers } = await buildUnsubscribeInfo(
        user.id,
        "notifyReviews",
        user.unsubscribeToken,
      );

      await sendEmail({
        to: user.email,
        subject: `New review on "${paper.title}"`,
        react: ReviewReceivedEmail({
          authorName: user.name,
          paperTitle: paper.title,
          paperUrl,
          reviewerName,
          recommendation,
          unsubscribeUrl,
          settingsUrl,
        }),
        headers,
      });
    }
  } catch (err) {
    console.error("Failed to send review notification:", err);
  }
}

/**
 * Notify paper authors about a new comment, and/or the parent comment author about a reply.
 * Skips the commenter themselves.
 */
export async function notifyCommentReceived(
  paperId: string,
  commenterId: string,
  commentContent: string,
  parentCommentId?: string,
): Promise<void> {
  if (!isEmailEnabled()) return;

  try {
    const paper = await db.paper.findUnique({
      where: { id: paperId },
      select: {
        title: true,
        authors: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                notifyComments: true,
                unsubscribeToken: true,
              },
            },
          },
        },
      },
    });
    if (!paper) return;

    const commenter = await db.user.findUnique({
      where: { id: commenterId },
      select: { name: true },
    });
    if (!commenter) return;

    const paperUrl = `${getBaseUrl()}/papers/${paperId}`;
    const settingsUrl = getSettingsUrl();
    const snippet =
      commentContent.length > 200
        ? commentContent.slice(0, 200) + "..."
        : commentContent;

    // Track who we've already notified to avoid duplicates
    const notified = new Set<string>();

    // If this is a reply, notify the parent comment author
    if (parentCommentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: parentCommentId },
        select: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              notifyComments: true,
              unsubscribeToken: true,
            },
          },
        },
      });

      if (
        parentComment &&
        parentComment.author.id !== commenterId &&
        parentComment.author.notifyComments
      ) {
        const { unsubscribeUrl, headers } = await buildUnsubscribeInfo(
          parentComment.author.id,
          "notifyComments",
          parentComment.author.unsubscribeToken,
        );

        await sendEmail({
          to: parentComment.author.email,
          subject: `Reply to your comment on "${paper.title}"`,
          react: CommentReceivedEmail({
            recipientName: parentComment.author.name,
            paperTitle: paper.title,
            paperUrl,
            commenterName: commenter.name,
            commentSnippet: snippet,
            isReply: true,
            unsubscribeUrl,
            settingsUrl,
          }),
          headers,
        });
        notified.add(parentComment.author.id);
      }
    }

    // Notify paper authors (skip commenter and anyone already notified)
    for (const { user } of paper.authors) {
      if (user.id === commenterId) continue;
      if (notified.has(user.id)) continue;
      if (!user.notifyComments) continue;

      const { unsubscribeUrl, headers } = await buildUnsubscribeInfo(
        user.id,
        "notifyComments",
        user.unsubscribeToken,
      );

      await sendEmail({
        to: user.email,
        subject: `New comment on "${paper.title}"`,
        react: CommentReceivedEmail({
          recipientName: user.name,
          paperTitle: paper.title,
          paperUrl,
          commenterName: commenter.name,
          commentSnippet: snippet,
          isReply: false,
          unsubscribeUrl,
          settingsUrl,
        }),
        headers,
      });
    }
  } catch (err) {
    console.error("Failed to send comment notification:", err);
  }
}

/**
 * Notify paper authors that their paper was endorsed.
 * Skips the endorser themselves (authors can't endorse their own, but just in case).
 */
export async function notifyEndorsementReceived(
  paperId: string,
  endorserId: string,
): Promise<void> {
  if (!isEmailEnabled()) return;

  try {
    const [paper, endorser] = await Promise.all([
      db.paper.findUnique({
        where: { id: paperId },
        select: {
          title: true,
          authors: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  notifyEndorsements: true,
                  unsubscribeToken: true,
                },
              },
            },
          },
        },
      }),
      db.user.findUnique({
        where: { id: endorserId },
        select: { name: true, reputationScore: true },
      }),
    ]);
    if (!paper || !endorser) return;

    // Fetch endorsement statement
    const endorsement = await db.endorsement.findUnique({
      where: { paperId_endorserId: { paperId, endorserId } },
      select: { statement: true },
    });

    const paperUrl = `${getBaseUrl()}/papers/${paperId}`;
    const settingsUrl = getSettingsUrl();

    for (const { user } of paper.authors) {
      if (user.id === endorserId) continue;
      if (!user.notifyEndorsements) continue;

      const { unsubscribeUrl, headers } = await buildUnsubscribeInfo(
        user.id,
        "notifyEndorsements",
        user.unsubscribeToken,
      );

      await sendEmail({
        to: user.email,
        subject: `Your paper was endorsed by ${endorser.name}`,
        react: EndorsementReceivedEmail({
          authorName: user.name,
          paperTitle: paper.title,
          paperUrl,
          endorserName: endorser.name,
          endorserReputation: endorser.reputationScore,
          statement: endorsement?.statement ?? undefined,
          unsubscribeUrl,
          settingsUrl,
        }),
        headers,
      });
    }
  } catch (err) {
    console.error("Failed to send endorsement notification:", err);
  }
}

/**
 * Notify paper authors that their paper has been accepted (SUBMITTED → PUBLISHED).
 */
export async function notifyPaperAccepted(
  paperId: string,
  reputationPoints: number,
): Promise<void> {
  if (!isEmailEnabled()) return;

  try {
    const paper = await db.paper.findUnique({
      where: { id: paperId },
      select: {
        title: true,
        authors: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                notifyPaperStatus: true,
                unsubscribeToken: true,
              },
            },
          },
        },
      },
    });
    if (!paper) return;

    const paperUrl = `${getBaseUrl()}/papers/${paperId}`;
    const settingsUrl = getSettingsUrl();

    for (const { user } of paper.authors) {
      if (!user.notifyPaperStatus) continue;

      const { unsubscribeUrl, headers } = await buildUnsubscribeInfo(
        user.id,
        "notifyPaperStatus",
        user.unsubscribeToken,
      );

      await sendEmail({
        to: user.email,
        subject: `Your paper "${paper.title}" has been accepted!`,
        react: PaperAcceptedEmail({
          authorName: user.name,
          paperTitle: paper.title,
          paperUrl,
          reputationEarned: reputationPoints,
          unsubscribeUrl,
          settingsUrl,
        }),
        headers,
      });
    }
  } catch (err) {
    console.error("Failed to send paper accepted notification:", err);
  }
}

/**
 * Notify a reviewer about their bounty payout.
 */
export async function notifyBountyPayout(
  reviewerId: string,
  paperId: string,
  amountCents: number,
  isPending: boolean,
): Promise<void> {
  if (!isEmailEnabled()) return;

  try {
    const [reviewer, paper] = await Promise.all([
      db.user.findUnique({
        where: { id: reviewerId },
        select: {
          name: true,
          email: true,
          notifyBounty: true,
          unsubscribeToken: true,
        },
      }),
      db.paper.findUnique({
        where: { id: paperId },
        select: { title: true },
      }),
    ]);
    if (!reviewer || !paper || !reviewer.notifyBounty) return;

    const baseUrl = getBaseUrl();
    const settingsUrl = getSettingsUrl();

    const { unsubscribeUrl, headers } = await buildUnsubscribeInfo(
      reviewerId,
      "notifyBounty",
      reviewer.unsubscribeToken,
    );

    await sendEmail({
      to: reviewer.email,
      subject: `You earned $${(amountCents / 100).toFixed(2)} for your review`,
      react: BountyPayoutEmail({
        reviewerName: reviewer.name,
        paperTitle: paper.title,
        paperUrl: `${baseUrl}/papers/${paperId}`,
        amountCents,
        isPending,
        settingsUrl,
        unsubscribeUrl,
      }),
      headers,
    });
  } catch (err) {
    console.error("Failed to send bounty payout notification:", err);
  }
}

/**
 * Notify a user that they've been invited as co-author on a paper.
 */
export async function notifyCoAuthorInvitation(
  inviteeId: string,
  paperId: string,
  inviterName: string,
): Promise<void> {
  if (!isEmailEnabled()) return;

  try {
    const [invitee, paper] = await Promise.all([
      db.user.findUnique({
        where: { id: inviteeId },
        select: {
          name: true,
          email: true,
          notifyInvitations: true,
          unsubscribeToken: true,
        },
      }),
      db.paper.findUnique({
        where: { id: paperId },
        select: { title: true },
      }),
    ]);
    if (!invitee || !paper || !invitee.notifyInvitations) return;

    const { unsubscribeUrl, headers } = await buildUnsubscribeInfo(
      inviteeId,
      "notifyInvitations",
      invitee.unsubscribeToken,
    );

    await sendEmail({
      to: invitee.email,
      subject: `You've been invited as co-author on "${paper.title}"`,
      react: CoAuthorInvitationEmail({
        inviteeName: invitee.name,
        paperTitle: paper.title,
        inviterName,
        dashboardUrl: `${getBaseUrl()}/dashboard`,
        unsubscribeUrl,
        settingsUrl: getSettingsUrl(),
      }),
      headers,
    });
  } catch (err) {
    console.error("Failed to send co-author invitation notification:", err);
  }
}

/**
 * Notify a paper author that a co-author invitation was accepted or declined.
 */
export async function notifyCoAuthorResponse(
  inviterId: string,
  paperId: string,
  inviteeName: string,
  accepted: boolean,
): Promise<void> {
  if (!isEmailEnabled()) return;

  try {
    const [inviter, paper] = await Promise.all([
      db.user.findUnique({
        where: { id: inviterId },
        select: {
          name: true,
          email: true,
          notifyInvitations: true,
          unsubscribeToken: true,
        },
      }),
      db.paper.findUnique({
        where: { id: paperId },
        select: { title: true },
      }),
    ]);
    if (!inviter || !paper || !inviter.notifyInvitations) return;

    const action = accepted ? "accepted" : "declined";

    const { unsubscribeUrl, headers } = await buildUnsubscribeInfo(
      inviterId,
      "notifyInvitations",
      inviter.unsubscribeToken,
    );

    await sendEmail({
      to: inviter.email,
      subject: `${inviteeName} ${action} your co-author invitation`,
      react: CoAuthorResponseEmail({
        inviterName: inviter.name,
        paperTitle: paper.title,
        inviteeName,
        accepted,
        paperUrl: `${getBaseUrl()}/papers/${paperId}`,
        unsubscribeUrl,
        settingsUrl: getSettingsUrl(),
      }),
      headers,
    });
  } catch (err) {
    console.error("Failed to send co-author response notification:", err);
  }
}
