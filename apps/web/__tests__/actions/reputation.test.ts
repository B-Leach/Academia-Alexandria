import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";

import { getReputationHistory, getReviewerStats } from "@/actions/reputation";

beforeEach(() => {
  // No auth mock needed — these are public read functions
});

describe("getReputationHistory", () => {
  it("should return reputation events with paper titles", async () => {
    prismaMock.reputationEvent.findMany.mockResolvedValue([
      { id: "e1", type: "PAPER_ACCEPTED", points: 10, sourcePaperId: "p1", sourceReviewId: null, createdAt: new Date() },
      { id: "e2", type: "REVIEW_SUBMITTED", points: 5, sourcePaperId: "p2", sourceReviewId: "r1", createdAt: new Date() },
    ] as any);
    prismaMock.paper.findMany.mockResolvedValue([
      { id: "p1", title: "Paper One" },
      { id: "p2", title: "Paper Two" },
    ] as any);

    const events = await getReputationHistory("user-1");
    expect(events).toHaveLength(2);
    expect(events[0].paperTitle).toBe("Paper One");
    expect(events[1].paperTitle).toBe("Paper Two");
  });

  it("should handle events without associated papers", async () => {
    prismaMock.reputationEvent.findMany.mockResolvedValue([
      { id: "e1", type: "ENDORSEMENT_GIVEN", points: 1, sourcePaperId: null, sourceReviewId: null, createdAt: new Date() },
    ] as any);
    prismaMock.paper.findMany.mockResolvedValue([]);

    const events = await getReputationHistory("user-1");
    expect(events[0].paperTitle).toBeNull();
  });

  it("should limit to 50 events", async () => {
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);
    prismaMock.paper.findMany.mockResolvedValue([]);

    await getReputationHistory("user-1");

    expect(prismaMock.reputationEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });
});

describe("getReviewerStats", () => {
  it("should return reviewCount and endorsementsGiven", async () => {
    prismaMock.review.count.mockResolvedValue(5);
    prismaMock.endorsement.count.mockResolvedValue(3);
    prismaMock.review.findMany.mockResolvedValue([]);

    const stats = await getReviewerStats("user-1");
    expect(stats.reviewCount).toBe(5);
    expect(stats.endorsementsGiven).toBe(3);
  });

  it("should return recommendation breakdown and disciplines", async () => {
    prismaMock.review.count.mockResolvedValue(3);
    prismaMock.endorsement.count.mockResolvedValue(0);
    prismaMock.review.findMany.mockResolvedValue([
      { recommendation: "SOUND", paper: { disciplines: ["physics", "math"] } },
      { recommendation: "SOUND", paper: { disciplines: ["physics"] } },
      { recommendation: "NEEDS_REVISION", paper: { disciplines: ["biology"] } },
    ] as any);

    const stats = await getReviewerStats("user-1");
    expect(stats.soundCount).toBe(2);
    expect(stats.needsRevisionCount).toBe(1);
    expect(stats.unsoundCount).toBe(0);
    expect(stats.disciplinesReviewed).toContain("physics");
    expect(stats.disciplinesReviewed).toContain("math");
    expect(stats.disciplinesReviewed).toContain("biology");
    expect(stats.disciplinesReviewed).toHaveLength(3);
  });
});
