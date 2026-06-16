import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  cleanDatabase,
  createTestUser,
  createTestPaper,
  submitTestPaper,
  addResearchAreas,
  setAuthenticatedAs,
  resetCounters,
  buildReviewFormData,
  skipCooloff,
} from "./helpers";
import { createReview, getReviews } from "@/actions/review";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
});

// ---------------------------------------------------------------------------
// createReview — basic behaviour
// ---------------------------------------------------------------------------

describe("createReview", () => {
  it("creates a review on a SUBMITTED paper and persists it in the DB", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs(reviewer);
    const fd = buildReviewFormData(paper.id);
    const result = await createReview(fd);

    expect(result.success).toBe(true);

    const review = await db.review.findFirst({
      where: { paperId: paper.id, reviewerId: reviewer.id },
    });
    expect(review).not.toBeNull();
    expect(review!.recommendation).toBe("SOUND");
    expect(review!.confidenceLevel).toBe(4);
    expect(review!.methodologyScore).toBe(7);
  });

  it("increments paper.reviewCount after creating a review", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs(reviewer);
    await createReview(buildReviewFormData(paper.id));

    const updated = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(updated.reviewCount).toBe(1);
  });

  it("rejects review when author tries to review own paper", async () => {
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs(author);
    const result = await createReview(buildReviewFormData(paper.id));

    expect(result.error).toContain("cannot review your own");

    const count = await db.review.count({ where: { paperId: paper.id } });
    expect(count).toBe(0);
  });

  it("rejects duplicate review from the same reviewer on the same paper", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs(reviewer);
    await createReview(buildReviewFormData(paper.id));

    const duplicate = await createReview(buildReviewFormData(paper.id));
    expect(duplicate.error).toContain("already reviewed");

    const count = await db.review.count({ where: { paperId: paper.id } });
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Qualifying vs non-qualifying reviews — reputation
// ---------------------------------------------------------------------------

describe("review qualification and reputation", () => {
  it("awards REVIEW_SUBMITTED rep event (+5) for a qualifying review (discipline overlap)", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    const paper = await createTestPaper(author.id, {
      disciplines: ["computer-science"],
    });
    await submitTestPaper(paper.id);

    // Give reviewer matching research area
    await addResearchAreas(reviewer.id, ["computer-science"]);

    setAuthenticatedAs(reviewer);
    await createReview(buildReviewFormData(paper.id));

    const repEvent = await db.reputationEvent.findFirst({
      where: { userId: reviewer.id, type: "REVIEW_SUBMITTED" },
    });
    expect(repEvent).not.toBeNull();
    expect(repEvent!.points).toBe(5);

    const updatedReviewer = await db.user.findUniqueOrThrow({
      where: { id: reviewer.id },
    });
    expect(updatedReviewer.reputationScore).toBe(5);
  });

  it("awards NO rep event when reviewer has high confidence but no discipline overlap", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    const paper = await createTestPaper(author.id, {
      disciplines: ["computer-science"],
    });
    await submitTestPaper(paper.id);

    // No research areas — high confidence alone should not qualify
    setAuthenticatedAs(reviewer);
    await createReview(buildReviewFormData(paper.id, { confidenceLevel: "5" }));

    const repEvent = await db.reputationEvent.findFirst({
      where: { userId: reviewer.id, type: "REVIEW_SUBMITTED" },
    });
    expect(repEvent).toBeNull();

    const updatedReviewer = await db.user.findUniqueOrThrow({
      where: { id: reviewer.id },
    });
    expect(updatedReviewer.reputationScore).toBe(0);
  });

  it("awards NO rep event for a non-qualifying review (no discipline overlap)", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer = await createTestUser({ name: "Reviewer" });
    const paper = await createTestPaper(author.id, {
      disciplines: ["computer-science"],
    });
    await submitTestPaper(paper.id);

    // Reviewer has biology, paper is computer-science — no overlap
    await addResearchAreas(reviewer.id, ["biology"]);

    setAuthenticatedAs(reviewer);
    await createReview(buildReviewFormData(paper.id, { confidenceLevel: "1" }));

    const repEvent = await db.reputationEvent.findFirst({
      where: { userId: reviewer.id, type: "REVIEW_SUBMITTED" },
    });
    expect(repEvent).toBeNull();

    const updatedReviewer = await db.user.findUniqueOrThrow({
      where: { id: reviewer.id },
    });
    expect(updatedReviewer.reputationScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getReviews — isQualifying flag
// ---------------------------------------------------------------------------

describe("getReviews", () => {
  it("returns reviews with the correct isQualifying flag", async () => {
    const author = await createTestUser({ name: "Author" });
    const qualifiedReviewer = await createTestUser({
      name: "Qualified Reviewer",
    });
    const unqualifiedReviewer = await createTestUser({
      name: "Unqualified Reviewer",
    });
    const paper = await createTestPaper(author.id, {
      disciplines: ["computer-science"],
    });
    await submitTestPaper(paper.id);

    // Qualified: has matching research area
    await addResearchAreas(qualifiedReviewer.id, ["computer-science"]);
    setAuthenticatedAs(qualifiedReviewer);
    await createReview(buildReviewFormData(paper.id));

    // Unqualified: no matching research area
    setAuthenticatedAs(unqualifiedReviewer);
    await createReview(buildReviewFormData(paper.id, { confidenceLevel: "5" }));

    const reviews = await getReviews(paper.id);
    expect(reviews).toHaveLength(2);

    const qualifiedResult = reviews.find(
      (r) => r.reviewer.id === qualifiedReviewer.id,
    );
    const unqualifiedResult = reviews.find(
      (r) => r.reviewer.id === unqualifiedReviewer.id,
    );

    expect(qualifiedResult!.isQualifying).toBe(true);
    expect(unqualifiedResult!.isQualifying).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tryAcceptPaper — automatic acceptance (requires 3 qualifying SOUND reviews)
// ---------------------------------------------------------------------------

describe("paper acceptance via tryAcceptPaper", () => {
  it("does NOT publish paper with only 2 qualifying SOUND reviews", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    const current = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(current.status).toBe("SUBMITTED");
  });

  it("promotes paper to PUBLISHED when 3 qualifying SOUND reviews are submitted", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    let current = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(current.status).toBe("SUBMITTED");

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    current = await db.paper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(current.status).toBe("SUBMITTED");

    // Skip the 72h cool-off so acceptance happens immediately
    await skipCooloff(paper.id);

    // Third qualifying SOUND review — triggers acceptance
    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    current = await db.paper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(current.status).toBe("PUBLISHED");
  });

  it("creates PAPER_ACCEPTED reputation events for each author upon acceptance", async () => {
    const author = await createTestUser({ name: "Author" });
    const coAuthor = await createTestUser({ name: "Co-Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });
    const paper = await createTestPaper(author.id, {
      coAuthorIds: [coAuthor.id],
    });
    await submitTestPaper(paper.id);

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    await skipCooloff(paper.id);

    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    const authorEvent = await db.reputationEvent.findFirst({
      where: {
        userId: author.id,
        type: "PAPER_ACCEPTED",
        sourcePaperId: paper.id,
      },
    });
    expect(authorEvent).not.toBeNull();

    const coAuthorEvent = await db.reputationEvent.findFirst({
      where: {
        userId: coAuthor.id,
        type: "PAPER_ACCEPTED",
        sourcePaperId: paper.id,
      },
    });
    expect(coAuthorEvent).not.toBeNull();
  });

  it("increments author reputationScore upon paper acceptance", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    await skipCooloff(paper.id);

    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    const updatedAuthor = await db.user.findUniqueOrThrow({
      where: { id: author.id },
    });
    // Reviewers have 0+5=5 rep after their qualifying reviews
    // avg = (5 + 5 + 5) / 3 = 5, which is < 100, so PAPER_ACCEPTED_LOW = 5
    expect(updatedAuthor.reputationScore).toBe(5);
  });

  it("awards 5 points (PAPER_ACCEPTED_LOW) when avg reviewer rep < 100", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    await skipCooloff(paper.id);

    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    const repEvent = await db.reputationEvent.findFirst({
      where: { userId: author.id, type: "PAPER_ACCEPTED" },
    });
    expect(repEvent).not.toBeNull();
    expect(repEvent!.points).toBe(5); // PAPER_ACCEPTED_LOW
  });
});

// ---------------------------------------------------------------------------
// Rejection scenarios — paper stays SUBMITTED
// ---------------------------------------------------------------------------

describe("paper rejection (stays SUBMITTED)", () => {
  it("2 SOUND + 1 UNSOUND keeps paper SUBMITTED (all must be SOUND)", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "UNSOUND" }),
    );

    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    const current = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(current.status).toBe("SUBMITTED");

    // No PAPER_ACCEPTED event should exist
    const acceptEvent = await db.reputationEvent.findFirst({
      where: { type: "PAPER_ACCEPTED", sourcePaperId: paper.id },
    });
    expect(acceptEvent).toBeNull();
  });

  it("2 SOUND + 1 NEEDS_REVISION keeps paper SUBMITTED", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "NEEDS_REVISION" }),
    );

    const current = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(current.status).toBe("SUBMITTED");
  });

  it("non-qualifying reviews do not count toward acceptance even if SOUND", async () => {
    const author = await createTestUser({ name: "Author" });
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });
    const paper = await createTestPaper(author.id, {
      disciplines: ["computer-science"],
    });
    await submitTestPaper(paper.id);

    // None of the reviewers have computer-science research areas
    // Even with high confidence, reviews should not qualify
    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, {
        recommendation: "SOUND",
        confidenceLevel: "5",
      }),
    );

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, {
        recommendation: "SOUND",
        confidenceLevel: "5",
      }),
    );

    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paper.id, {
        recommendation: "SOUND",
        confidenceLevel: "5",
      }),
    );

    const current = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(current.status).toBe("SUBMITTED");
  });
});

// ---------------------------------------------------------------------------
// Full end-to-end flow
// ---------------------------------------------------------------------------

describe("full review-to-acceptance flow", () => {
  it("author creates paper, submits, 3 qualified reviewers approve SOUND, paper published with all rep events", async () => {
    // 1. Create author and paper
    const author = await createTestUser({ name: "Author" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // 2. First reviewer submits a qualifying SOUND review
    const reviewer1 = await createTestUser({ name: "Reviewer One" });
    await addResearchAreas(reviewer1.id, ["computer-science"]);
    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    // 3. Second reviewer submits a qualifying SOUND review
    const reviewer2 = await createTestUser({ name: "Reviewer Two" });
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    // Still SUBMITTED after 2
    let current = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(current.status).toBe("SUBMITTED");

    // Skip cool-off so acceptance happens immediately on 3rd review
    await skipCooloff(paper.id);

    // 4. Third reviewer submits a qualifying SOUND review — triggers acceptance
    const reviewer3 = await createTestUser({ name: "Reviewer Three" });
    await addResearchAreas(reviewer3.id, ["computer-science"]);
    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paper.id, { recommendation: "SOUND" }),
    );

    // --- Verify paper status ---
    const finalPaper = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(finalPaper.status).toBe("PUBLISHED");
    expect(finalPaper.reviewCount).toBe(3);

    // --- Verify author PAPER_ACCEPTED rep event ---
    const authorAcceptEvent = await db.reputationEvent.findFirst({
      where: {
        userId: author.id,
        type: "PAPER_ACCEPTED",
        sourcePaperId: paper.id,
      },
    });
    expect(authorAcceptEvent).not.toBeNull();
    expect(authorAcceptEvent!.points).toBe(5); // PAPER_ACCEPTED_LOW (avg reviewer rep < 100)

    // --- Verify all reviewers have REVIEW_SUBMITTED rep events ---
    for (const reviewer of [reviewer1, reviewer2, reviewer3]) {
      const repEvent = await db.reputationEvent.findFirst({
        where: {
          userId: reviewer.id,
          type: "REVIEW_SUBMITTED",
          sourcePaperId: paper.id,
        },
      });
      expect(repEvent).not.toBeNull();
      expect(repEvent!.points).toBe(5);
    }

    // --- Verify final reputation scores ---
    const finalAuthor = await db.user.findUniqueOrThrow({
      where: { id: author.id },
    });
    expect(finalAuthor.reputationScore).toBe(5);

    for (const reviewer of [reviewer1, reviewer2, reviewer3]) {
      const finalReviewer = await db.user.findUniqueOrThrow({
        where: { id: reviewer.id },
      });
      expect(finalReviewer.reputationScore).toBe(5);
    }
  });
});
