import { describe, it, expect, beforeEach } from "vitest";
import { REPUTATION_POINTS } from "@academia-alexandria/shared";
import { db } from "@/lib/db";
import {
  cleanDatabase,
  createTestUser,
  createTestPaper,
  setAuthenticatedAs,
  resetCounters,
  buildFormData,
  buildReviewFormData,
  addResearchAreas,
  skipCooloff,
} from "./helpers";
import { RedirectError } from "./setup";
import { createPaper, submitPaper } from "@/actions/paper";
import { createReview } from "@/actions/review";
import { createComment, getComments } from "@/actions/comment";
import { createEndorsement } from "@/actions/endorsement";
import { getReputationHistory } from "@/actions/reputation";
import { respondToInvitation } from "@/actions/invitation";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
});

// ---------------------------------------------------------------------------
// Helper: build a valid paper FormData that satisfies publishPaperSchema
// (title >= 5, abstract >= 50, content >= 100, >= 1 discipline, >= 1 keyword)
// ---------------------------------------------------------------------------

function validPaperFormData(
  overrides: Record<string, string | string[]> = {},
): FormData {
  return buildFormData({
    title: "A Comprehensive Study of Integration Testing Patterns",
    abstract:
      "This paper explores modern integration testing strategies for full-stack web applications using real database connections and realistic workloads.",
    content:
      "Integration testing is a critical phase in software development. This paper examines patterns for testing server actions against real PostgreSQL databases with Prisma ORM. We demonstrate how to maintain test isolation while verifying real transaction behavior and constraint enforcement.",
    disciplines: ["computer-science"],
    keywords: "testing,integration",
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Helper: submit a paper through the server action (catches RedirectError)
// ---------------------------------------------------------------------------

async function submitPaperAction(paperId: string): Promise<void> {
  try {
    await submitPaper(paperId);
  } catch (err) {
    if (!(err instanceof RedirectError)) {
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: create a paper via the createPaper server action
// ---------------------------------------------------------------------------

async function createPaperAction(
  overrides: Record<string, string | string[]> = {},
): Promise<string> {
  const fd = validPaperFormData(overrides);
  const result = await createPaper(fd);
  expect(result.success).toBe(true);
  expect(result.paperId).toBeDefined();
  return result.paperId!;
}

// ---------------------------------------------------------------------------
// Helper: submit two qualifying SOUND reviews to get a paper PUBLISHED
// ---------------------------------------------------------------------------

async function publishPaperWithReviews(paperId: string): Promise<{
  reviewer1: Awaited<ReturnType<typeof createTestUser>>;
  reviewer2: Awaited<ReturnType<typeof createTestUser>>;
  reviewer3: Awaited<ReturnType<typeof createTestUser>>;
}> {
  const reviewer1 = await createTestUser({ name: "Reviewer A" });
  const reviewer2 = await createTestUser({ name: "Reviewer B" });
  const reviewer3 = await createTestUser({ name: "Reviewer C" });

  await addResearchAreas(reviewer1.id, ["computer-science"]);
  await addResearchAreas(reviewer2.id, ["computer-science"]);
  await addResearchAreas(reviewer3.id, ["computer-science"]);

  setAuthenticatedAs(reviewer1);
  await createReview(
    buildReviewFormData(paperId, {
      recommendation: "SOUND",
      confidenceLevel: "4",
    }),
  );

  setAuthenticatedAs(reviewer2);
  await createReview(
    buildReviewFormData(paperId, {
      recommendation: "SOUND",
      confidenceLevel: "3",
    }),
  );

  await skipCooloff(paperId);

  setAuthenticatedAs(reviewer3);
  await createReview(
    buildReviewFormData(paperId, {
      recommendation: "SOUND",
      confidenceLevel: "3",
    }),
  );

  return { reviewer1, reviewer2, reviewer3 };
}

// ===========================================================================
// 1. Complete lifecycle: create -> submit -> review -> published
// ===========================================================================

describe("Complete paper lifecycle", () => {
  it("goes from creation through submission and peer review to publication with correct reputation", async () => {
    // 1. Create author and authenticate
    const author = await createTestUser({ name: "Lifecycle Author" });
    setAuthenticatedAs(author);

    // 2. Create paper via server action
    const paperId = await createPaperAction();

    // 3. Submit paper via server action (throws RedirectError)
    await submitPaperAction(paperId);

    // Verify paper is SUBMITTED
    let paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } });
    expect(paper.status).toBe("SUBMITTED");

    // 4. Three reviewers submit qualifying SOUND reviews (discipline overlap required)
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    const review1Result = await createReview(
      buildReviewFormData(paperId, {
        recommendation: "SOUND",
        confidenceLevel: "4",
      }),
    );
    expect(review1Result.success).toBe(true);

    setAuthenticatedAs(reviewer2);
    const review2Result = await createReview(
      buildReviewFormData(paperId, {
        recommendation: "SOUND",
        confidenceLevel: "3",
      }),
    );
    expect(review2Result.success).toBe(true);

    await skipCooloff(paperId);

    setAuthenticatedAs(reviewer3);
    const review3Result = await createReview(
      buildReviewFormData(paperId, {
        recommendation: "SOUND",
        confidenceLevel: "3",
      }),
    );
    expect(review3Result.success).toBe(true);

    // 5. Verify final state
    paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } });
    expect(paper.status).toBe("PUBLISHED");
    expect(paper.reviewCount).toBe(3);

    // Author should have PAPER_ACCEPTED_LOW = 5 (avg reviewer rep < 100)
    const finalAuthor = await db.user.findUniqueOrThrow({
      where: { id: author.id },
    });
    expect(finalAuthor.reputationScore).toBe(5);

    // Reviewer 1 should have REVIEW_SUBMITTED = 5
    const finalReviewer1 = await db.user.findUniqueOrThrow({
      where: { id: reviewer1.id },
    });
    expect(finalReviewer1.reputationScore).toBe(5);

    // Reviewer 2 should have REVIEW_SUBMITTED = 5
    const finalReviewer2 = await db.user.findUniqueOrThrow({
      where: { id: reviewer2.id },
    });
    expect(finalReviewer2.reputationScore).toBe(5);

    // Reviewer 3 should have REVIEW_SUBMITTED = 5
    const finalReviewer3 = await db.user.findUniqueOrThrow({
      where: { id: reviewer3.id },
    });
    expect(finalReviewer3.reputationScore).toBe(5);
  });
});

// ===========================================================================
// 2. Multi-author lifecycle: co-authors both get PAPER_ACCEPTED rep
// ===========================================================================

describe("Multi-author paper lifecycle", () => {
  it("awards PAPER_ACCEPTED reputation to both primary and co-author", async () => {
    // 1. Create two authors
    const author1 = await createTestUser({
      name: "Primary Author",
      email: "primary@example.com",
    });
    const author2 = await createTestUser({
      name: "Co-Author",
      email: "coauthor@example.com",
    });

    // 2. Auth as primary author, create paper with co-author ID
    setAuthenticatedAs(author1);
    const paperId = await createPaperAction({
      coAuthorIds: author2.id,
    });

    // Verify only primary author is linked; co-author has pending invitation
    const paperAuthors = await db.paperAuthor.findMany({
      where: { paperId },
      orderBy: { order: "asc" },
    });
    expect(paperAuthors).toHaveLength(1);
    expect(paperAuthors[0].userId).toBe(author1.id);

    // Co-author accepts the invitation
    const invitation = await db.coAuthorInvitation.findFirst({
      where: { paperId, inviteeId: author2.id },
    });
    expect(invitation).not.toBeNull();
    setAuthenticatedAs(author2);
    const acceptResult = await respondToInvitation(invitation!.id, true);
    expect(acceptResult.success).toBe(true);

    // Now both should be linked
    const updatedAuthors = await db.paperAuthor.findMany({
      where: { paperId },
      orderBy: { order: "asc" },
    });
    expect(updatedAuthors).toHaveLength(2);

    // 3. Submit paper (switch back to primary author)
    setAuthenticatedAs(author1);
    await submitPaperAction(paperId);

    // 4. Three reviewers submit qualifying SOUND reviews
    const reviewer1 = await createTestUser({ name: "Reviewer 1" });
    const reviewer2 = await createTestUser({ name: "Reviewer 2" });
    const reviewer3 = await createTestUser({ name: "Reviewer 3" });

    await addResearchAreas(reviewer1.id, ["computer-science"]);
    await addResearchAreas(reviewer2.id, ["computer-science"]);
    await addResearchAreas(reviewer3.id, ["computer-science"]);

    setAuthenticatedAs(reviewer1);
    await createReview(
      buildReviewFormData(paperId, {
        recommendation: "SOUND",
        confidenceLevel: "4",
      }),
    );

    setAuthenticatedAs(reviewer2);
    await createReview(
      buildReviewFormData(paperId, {
        recommendation: "SOUND",
        confidenceLevel: "3",
      }),
    );

    await skipCooloff(paperId);

    setAuthenticatedAs(reviewer3);
    await createReview(
      buildReviewFormData(paperId, {
        recommendation: "SOUND",
        confidenceLevel: "3",
      }),
    );

    // 5. Verify paper is PUBLISHED
    const paper = await db.paper.findUniqueOrThrow({
      where: { id: paperId },
    });
    expect(paper.status).toBe("PUBLISHED");

    // 6. Verify both authors have PAPER_ACCEPTED rep events
    const author1Event = await db.reputationEvent.findFirst({
      where: {
        userId: author1.id,
        type: "PAPER_ACCEPTED",
        sourcePaperId: paperId,
      },
    });
    expect(author1Event).not.toBeNull();
    expect(author1Event!.points).toBe(5);

    const author2Event = await db.reputationEvent.findFirst({
      where: {
        userId: author2.id,
        type: "PAPER_ACCEPTED",
        sourcePaperId: paperId,
      },
    });
    expect(author2Event).not.toBeNull();
    expect(author2Event!.points).toBe(5);

    // 7. Verify both authors have updated reputationScore = 5
    const finalAuthor1 = await db.user.findUniqueOrThrow({
      where: { id: author1.id },
    });
    expect(finalAuthor1.reputationScore).toBe(5);

    const finalAuthor2 = await db.user.findUniqueOrThrow({
      where: { id: author2.id },
    });
    expect(finalAuthor2.reputationScore).toBe(5);
  });
});

// ===========================================================================
// 3. Reputation accumulation: reviewer rep stacks across papers
// ===========================================================================

describe("Reputation accumulation across multiple papers", () => {
  it("accumulates reviewer reputation across reviews on different papers", async () => {
    // --- Paper 1 ---
    const author1 = await createTestUser({ name: "Author One" });
    const paper1 = await createTestPaper(author1.id);
    const { id: paper1Id } = paper1;

    // Submit paper 1 via DB helper (direct, since we only need SUBMITTED state)
    await db.paper.update({
      where: { id: paper1Id },
      data: { status: "SUBMITTED", publishedAt: new Date() },
    });

    // Create the reviewer who will review both papers
    const reviewer = await createTestUser({ name: "Persistent Reviewer" });
    await addResearchAreas(reviewer.id, ["computer-science"]);

    // Reviewer submits qualifying SOUND review on paper 1
    setAuthenticatedAs(reviewer);
    const result1 = await createReview(
      buildReviewFormData(paper1Id, {
        recommendation: "SOUND",
        confidenceLevel: "4",
      }),
    );
    expect(result1.success).toBe(true);

    // Verify reviewer has 5 rep after first review
    let updatedReviewer = await db.user.findUniqueOrThrow({
      where: { id: reviewer.id },
    });
    expect(updatedReviewer.reputationScore).toBe(5);

    // --- Paper 2 ---
    const author2 = await createTestUser({ name: "Author Two" });
    const paper2 = await createTestPaper(author2.id, {
      title: "Second Paper on Different Topic",
    });
    const { id: paper2Id } = paper2;

    await db.paper.update({
      where: { id: paper2Id },
      data: { status: "SUBMITTED", publishedAt: new Date() },
    });

    // Same reviewer submits qualifying SOUND review on paper 2
    setAuthenticatedAs(reviewer);
    const result2 = await createReview(
      buildReviewFormData(paper2Id, {
        recommendation: "SOUND",
        confidenceLevel: "3",
      }),
    );
    expect(result2.success).toBe(true);

    // Verify reviewer now has 10 rep (5 + 5, cumulative)
    updatedReviewer = await db.user.findUniqueOrThrow({
      where: { id: reviewer.id },
    });
    expect(updatedReviewer.reputationScore).toBe(10);

    // Verify two distinct REVIEW_SUBMITTED events exist
    const repEvents = await db.reputationEvent.findMany({
      where: { userId: reviewer.id, type: "REVIEW_SUBMITTED" },
      orderBy: { createdAt: "asc" },
    });
    expect(repEvents).toHaveLength(2);
    expect(repEvents[0].sourcePaperId).toBe(paper1Id);
    expect(repEvents[0].points).toBe(5);
    expect(repEvents[1].sourcePaperId).toBe(paper2Id);
    expect(repEvents[1].points).toBe(5);
  });
});

// ===========================================================================
// 4. Comments on an accepted paper: top-level + threaded reply
// ===========================================================================

describe("Comments on accepted paper", () => {
  it("creates top-level comment and threaded reply, verifies comment tree and count", async () => {
    // 1. Create author, paper, submit, and get it PUBLISHED via 2 SOUND reviews
    const author = await createTestUser({ name: "Paper Author" });
    setAuthenticatedAs(author);
    const paperId = await createPaperAction();
    await submitPaperAction(paperId);

    await publishPaperWithReviews(paperId);

    // Verify paper is PUBLISHED
    let paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } });
    expect(paper.status).toBe("PUBLISHED");

    // 2. Create a commenter
    const commenter = await createTestUser({ name: "Active Commenter" });
    setAuthenticatedAs(commenter);

    // 3. Create top-level comment
    const commentFd = buildFormData({
      content: "This is an excellent paper with solid methodology.",
      paperId,
    });
    const commentResult = await createComment(commentFd);
    expect(commentResult.success).toBe(true);

    // 4. Fetch comments to get the top-level comment ID
    let comments = await getComments(paperId);
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe(
      "This is an excellent paper with solid methodology.",
    );
    expect(comments[0].author.id).toBe(commenter.id);
    expect(comments[0].author.name).toBe("Active Commenter");
    expect(comments[0].replies).toHaveLength(0);

    const topLevelCommentId = comments[0].id;

    // 5. Create a reply to the top-level comment
    const replyFd = buildFormData({
      content: "I agree, the results are very convincing.",
      paperId,
      parentId: topLevelCommentId,
    });
    const replyResult = await createComment(replyFd);
    expect(replyResult.success).toBe(true);

    // 6. Verify comment tree structure
    comments = await getComments(paperId);
    expect(comments).toHaveLength(1); // Still 1 top-level comment
    expect(comments[0].replies).toHaveLength(1); // With 1 reply
    expect(comments[0].replies[0].content).toBe(
      "I agree, the results are very convincing.",
    );
    expect(comments[0].replies[0].author.id).toBe(commenter.id);

    // 7. Verify paper.commentCount = 2
    paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } });
    expect(paper.commentCount).toBe(2);
  });
});

// ===========================================================================
// 5. Endorsement after acceptance: rep for author and endorser
// ===========================================================================

describe("Endorsement after paper acceptance", () => {
  it("endorses a published paper, awards rep to author and endorser, verifies reputation history", async () => {
    // 1. Create author, paper, submit, and get it PUBLISHED via 2 SOUND reviews
    const author = await createTestUser({ name: "Endorsable Author" });
    setAuthenticatedAs(author);
    const paperId = await createPaperAction();
    await submitPaperAction(paperId);

    await publishPaperWithReviews(paperId);

    // Verify paper is PUBLISHED and author has PAPER_ACCEPTED rep
    let paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } });
    expect(paper.status).toBe("PUBLISHED");

    let authorUser = await db.user.findUniqueOrThrow({
      where: { id: author.id },
    });
    // Author should have PAPER_ACCEPTED_LOW = 5
    expect(authorUser.reputationScore).toBe(5);

    // 2. Create endorser with reputationScore >= 100 (CAN_ENDORSE threshold)
    const endorser = await createTestUser({
      name: "Trusted Endorser",
      reputationScore: 150,
    });
    setAuthenticatedAs(endorser);

    // 3. Create endorsement
    const endorseFd = buildFormData({
      paperId,
      statement:
        "This research makes a significant contribution to the field of integration testing.",
    });
    const endorseResult = await createEndorsement(endorseFd);
    expect(endorseResult.success).toBe(true);

    // 4. Verify paper endorsement count
    paper = await db.paper.findUniqueOrThrow({ where: { id: paperId } });
    expect(paper.endorsementCount).toBe(1);

    // 5. Verify author receives ENDORSEMENT_RECEIVED rep event (15 points)
    // (endorser rep 150 < TRUSTED_REVIEWER threshold of 500, so ENDORSEMENT_RECEIVED not PAPER_ENDORSED_BY_TRUSTED)
    const authorEndorseEvent = await db.reputationEvent.findFirst({
      where: {
        userId: author.id,
        type: "ENDORSEMENT_RECEIVED",
        sourcePaperId: paperId,
      },
    });
    expect(authorEndorseEvent).not.toBeNull();
    expect(authorEndorseEvent!.points).toBe(
      REPUTATION_POINTS.ENDORSEMENT_RECEIVED,
    );

    // Author reputationScore should now be 5 (PAPER_ACCEPTED) + ENDORSEMENT_RECEIVED
    authorUser = await db.user.findUniqueOrThrow({
      where: { id: author.id },
    });
    expect(authorUser.reputationScore).toBe(
      5 + REPUTATION_POINTS.ENDORSEMENT_RECEIVED,
    );

    // 6. Verify endorser receives ENDORSEMENT_GIVEN rep event (1 point)
    const endorserGivenEvent = await db.reputationEvent.findFirst({
      where: {
        userId: endorser.id,
        type: "ENDORSEMENT_GIVEN",
        sourcePaperId: paperId,
      },
    });
    expect(endorserGivenEvent).not.toBeNull();
    expect(endorserGivenEvent!.points).toBe(
      REPUTATION_POINTS.ENDORSEMENT_GIVEN,
    );

    // Endorser reputationScore should be 150 (initial) + ENDORSEMENT_GIVEN
    const endorserUser = await db.user.findUniqueOrThrow({
      where: { id: endorser.id },
    });
    expect(endorserUser.reputationScore).toBe(
      150 + REPUTATION_POINTS.ENDORSEMENT_GIVEN,
    );

    // 7. Verify getReputationHistory for author includes both events
    const authorHistory = await getReputationHistory(author.id);
    expect(authorHistory.length).toBeGreaterThanOrEqual(2);

    const historyTypes = authorHistory.map((e) => e.type);
    expect(historyTypes).toContain("PAPER_ACCEPTED");
    expect(historyTypes).toContain("ENDORSEMENT_RECEIVED");

    // All events should have the paperTitle populated
    const paperAcceptedEvent = authorHistory.find(
      (e) => e.type === "PAPER_ACCEPTED",
    );
    expect(paperAcceptedEvent).toBeDefined();
    expect(paperAcceptedEvent!.paperTitle).toBe(
      "A Comprehensive Study of Integration Testing Patterns",
    );

    const endorsementReceivedEvent = authorHistory.find(
      (e) => e.type === "ENDORSEMENT_RECEIVED",
    );
    expect(endorsementReceivedEvent).toBeDefined();
    expect(endorsementReceivedEvent!.paperTitle).toBe(
      "A Comprehensive Study of Integration Testing Patterns",
    );
  });
});
