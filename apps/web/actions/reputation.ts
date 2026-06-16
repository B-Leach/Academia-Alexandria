"use server";

import { db } from "@/lib/db";

export async function getReputationHistory(userId: string) {
  const events = await db.reputationEvent.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      points: true,
      sourcePaperId: true,
      sourceReviewId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fetch paper titles for events that reference a paper
  const paperIds = [
    ...new Set(events.map((e) => e.sourcePaperId).filter(Boolean) as string[]),
  ];

  const papers =
    paperIds.length > 0
      ? await db.paper.findMany({
          where: { id: { in: paperIds } },
          select: { id: true, title: true },
        })
      : [];

  const paperMap = new Map(papers.map((p) => [p.id, p.title]));

  return events.map((e) => ({
    ...e,
    paperTitle: e.sourcePaperId ? paperMap.get(e.sourcePaperId) ?? null : null,
  }));
}

export async function getReputationBreakdown(userId: string) {
  const events = await db.reputationEvent.groupBy({
    by: ["type"],
    where: { userId },
    _sum: { points: true },
    _count: true,
  });

  return events.map((e) => ({
    type: e.type,
    points: e._sum.points ?? 0,
    count: e._count,
  }));
}

export async function getReviewerStats(userId: string) {
  const [reviewCount, endorsementsGiven, reviews] = await Promise.all([
    db.review.count({ where: { reviewerId: userId } }),
    db.endorsement.count({ where: { endorserId: userId } }),
    db.review.findMany({
      where: { reviewerId: userId },
      select: {
        recommendation: true,
        paper: { select: { disciplines: true } },
      },
    }),
  ]);

  const soundCount = reviews.filter((r) => r.recommendation === "SOUND").length;
  const needsRevisionCount = reviews.filter((r) => r.recommendation === "NEEDS_REVISION").length;
  const unsoundCount = reviews.filter((r) => r.recommendation === "UNSOUND").length;

  // Collect unique disciplines reviewed
  const disciplineSet = new Set<string>();
  for (const r of reviews) {
    for (const d of r.paper.disciplines) {
      disciplineSet.add(d);
    }
  }

  return {
    reviewCount,
    endorsementsGiven,
    soundCount,
    needsRevisionCount,
    unsoundCount,
    disciplinesReviewed: [...disciplineSet],
  };
}
