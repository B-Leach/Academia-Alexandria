"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/** Reputation event types that represent things happening TO the user (not self-activity). */
const INCOMING_REP_TYPES = [
  "PAPER_ACCEPTED",
  "ENDORSEMENT_RECEIVED",
  "PAPER_ENDORSED_BY_TRUSTED",
  "BOUNTY_REVIEW_COMPLETED",
] as const;

export type NotificationItem = {
  id: string;
  type:
    | "paper_accepted"
    | "endorsement_received"
    | "paper_endorsed_trusted"
    | "bounty_review_completed"
    | "new_review"
    | "new_comment"
    | "co_author_invitation";
  title: string;
  description: string;
  paperId: string | null;
  createdAt: Date;
  isRead: boolean;
};

export async function getNotifications(): Promise<NotificationItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lastNotificationReadAt: true, createdAt: true },
  });
  const readCutoff = user?.lastNotificationReadAt ?? user?.createdAt ?? new Date(0);

  const [repEvents, reviews, comments, invitations] = await Promise.all([
    // Incoming reputation events (things happening to you)
    db.reputationEvent.findMany({
      where: {
        userId,
        type: { in: [...INCOMING_REP_TYPES] },
      },
      select: {
        id: true,
        type: true,
        points: true,
        sourcePaperId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // New reviews on your papers (not by you)
    db.review.findMany({
      where: {
        paper: { authors: { some: { userId } } },
        reviewerId: { not: userId },
      },
      select: {
        id: true,
        paperId: true,
        paper: { select: { title: true } },
        reviewer: { select: { name: true } },
        isAnonymous: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // New comments on your papers (not by you)
    db.comment.findMany({
      where: {
        paper: { authors: { some: { userId } } },
        authorId: { not: userId },
      },
      select: {
        id: true,
        paperId: true,
        paper: { select: { title: true } },
        author: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Pending co-author invitations
    db.coAuthorInvitation.findMany({
      where: { inviteeId: userId, status: "PENDING" },
      select: {
        id: true,
        paper: { select: { id: true, title: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build paper title lookup for rep events
  const paperIds = [
    ...new Set(repEvents.map((e) => e.sourcePaperId).filter(Boolean) as string[]),
  ];
  const papers =
    paperIds.length > 0
      ? await db.paper.findMany({
          where: { id: { in: paperIds } },
          select: { id: true, title: true },
        })
      : [];
  const paperMap = new Map(papers.map((p) => [p.id, p.title]));

  const REP_TYPE_MAP: Record<string, NotificationItem["type"]> = {
    PAPER_ACCEPTED: "paper_accepted",
    ENDORSEMENT_RECEIVED: "endorsement_received",
    PAPER_ENDORSED_BY_TRUSTED: "paper_endorsed_trusted",
    BOUNTY_REVIEW_COMPLETED: "bounty_review_completed",
  };

  const REP_LABELS: Record<string, string> = {
    PAPER_ACCEPTED: "Your paper was accepted",
    ENDORSEMENT_RECEIVED: "Your paper received an endorsement",
    PAPER_ENDORSED_BY_TRUSTED: "A trusted reviewer endorsed your paper",
    BOUNTY_REVIEW_COMPLETED: "A bounty review was completed on your paper",
  };

  const items: NotificationItem[] = [];

  for (const event of repEvents) {
    const paperTitle = event.sourcePaperId
      ? paperMap.get(event.sourcePaperId)
      : null;
    items.push({
      id: `rep-${event.id}`,
      type: REP_TYPE_MAP[event.type] ?? "paper_accepted",
      title: REP_LABELS[event.type] ?? event.type,
      description: paperTitle
        ? `${paperTitle} (+${event.points} rep)`
        : `+${event.points} reputation`,
      paperId: event.sourcePaperId,
      createdAt: event.createdAt,
      isRead: event.createdAt <= readCutoff,
    });
  }

  for (const review of reviews) {
    const reviewer = review.isAnonymous ? "An anonymous reviewer" : (review.reviewer.name ?? "Someone");
    items.push({
      id: `review-${review.id}`,
      type: "new_review",
      title: `${reviewer} reviewed your paper`,
      description: review.paper.title,
      paperId: review.paperId,
      createdAt: review.createdAt,
      isRead: review.createdAt <= readCutoff,
    });
  }

  for (const comment of comments) {
    items.push({
      id: `comment-${comment.id}`,
      type: "new_comment",
      title: `${comment.author.name ?? "Someone"} commented on your paper`,
      description: comment.paper.title,
      paperId: comment.paperId,
      createdAt: comment.createdAt,
      isRead: comment.createdAt <= readCutoff,
    });
  }

  for (const inv of invitations) {
    items.push({
      id: `inv-${inv.id}`,
      type: "co_author_invitation",
      title: "Co-author invitation",
      description: inv.paper.title,
      paperId: inv.paper.id,
      createdAt: inv.createdAt,
      isRead: inv.createdAt <= readCutoff,
    });
  }

  // Sort all by date descending, cap at 100
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, 100);
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const result = await db.$queryRaw<[{ count: bigint }]>`
    SELECT (
      SELECT COUNT(*)::int FROM reputation_events
      WHERE "userId" = ${userId}
        AND type IN ('PAPER_ACCEPTED', 'ENDORSEMENT_RECEIVED', 'PAPER_ENDORSED_BY_TRUSTED', 'BOUNTY_REVIEW_COMPLETED')
        AND "createdAt" > COALESCE(
          (SELECT "lastNotificationReadAt" FROM users WHERE id = ${userId}),
          (SELECT "createdAt" FROM users WHERE id = ${userId})
        )
    ) + (
      SELECT COUNT(*)::int FROM reviews
      WHERE "paperId" IN (SELECT "paperId" FROM paper_authors WHERE "userId" = ${userId})
        AND "reviewerId" != ${userId}
        AND "createdAt" > COALESCE(
          (SELECT "lastNotificationReadAt" FROM users WHERE id = ${userId}),
          (SELECT "createdAt" FROM users WHERE id = ${userId})
        )
    ) + (
      SELECT COUNT(*)::int FROM comments
      WHERE "paperId" IN (SELECT "paperId" FROM paper_authors WHERE "userId" = ${userId})
        AND "authorId" != ${userId}
        AND "createdAt" > COALESCE(
          (SELECT "lastNotificationReadAt" FROM users WHERE id = ${userId}),
          (SELECT "createdAt" FROM users WHERE id = ${userId})
        )
    ) + (
      SELECT COUNT(*)::int FROM co_author_invitations
      WHERE "inviteeId" = ${userId}
        AND status = 'PENDING'
        AND "createdAt" > COALESCE(
          (SELECT "lastNotificationReadAt" FROM users WHERE id = ${userId}),
          (SELECT "createdAt" FROM users WHERE id = ${userId})
        )
    ) AS count
  `;

  return Math.min(Number(result[0]?.count ?? 0), 10);
}

export async function markNotificationsRead(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await db.user.updateMany({
    where: { id: session.user.id },
    data: { lastNotificationReadAt: new Date() },
  });
}
