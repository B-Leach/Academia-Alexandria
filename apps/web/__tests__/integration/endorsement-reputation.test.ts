import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  cleanDatabase,
  createTestUser,
  createTestPaper,
  submitTestPaper,
  publishTestPaper,
  setAuthenticatedAs,
  resetCounters,
  buildFormData,
} from "./helpers";
import { createEndorsement, getEndorsements } from "@/actions/endorsement";
import { REPUTATION_POINTS } from "@academia-alexandria/shared";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
});

// ---------------------------------------------------------------------------
// createEndorsement — reputation threshold checks
// ---------------------------------------------------------------------------

describe("createEndorsement — reputation thresholds", () => {
  it("rejects when endorser reputation is below 100", async () => {
    const author = await createTestUser({ name: "Author" });
    const endorser = await createTestUser({
      name: "Low Rep Endorser",
      reputationScore: 50,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs(endorser);
    const fd = buildFormData({ paperId: paper.id, statement: "Great paper" });
    const result = await createEndorsement(fd);

    expect(result.error).toContain("100 reputation");
    expect(result.success).toBeUndefined();

    const count = await db.endorsement.count({ where: { paperId: paper.id } });
    expect(count).toBe(0);
  });

  it("succeeds when endorser reputation is >= 100", async () => {
    const author = await createTestUser({ name: "Author" });
    const endorser = await createTestUser({
      name: "Qualified Endorser",
      reputationScore: 100,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs(endorser);
    const fd = buildFormData({
      paperId: paper.id,
      statement: "Excellent work",
    });
    const result = await createEndorsement(fd);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    const endorsement = await db.endorsement.findFirst({
      where: { paperId: paper.id, endorserId: endorser.id },
    });
    expect(endorsement).not.toBeNull();
    expect(endorsement!.statement).toBe("Excellent work");
  });
});

// ---------------------------------------------------------------------------
// createEndorsement — validation rules
// ---------------------------------------------------------------------------

describe("createEndorsement — validation rules", () => {
  it("rejects endorsement on a non-PUBLISHED paper", async () => {
    const author = await createTestUser({ name: "Author" });
    const endorser = await createTestUser({
      name: "Endorser",
      reputationScore: 150,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    // Paper is SUBMITTED, not PUBLISHED

    setAuthenticatedAs(endorser);
    const fd = buildFormData({ paperId: paper.id, statement: "Good research" });
    const result = await createEndorsement(fd);

    expect(result.error).toContain("not published");

    const count = await db.endorsement.count({ where: { paperId: paper.id } });
    expect(count).toBe(0);
  });

  it("rejects when author tries to endorse their own paper", async () => {
    const author = await createTestUser({
      name: "Author",
      reputationScore: 200,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs(author);
    const fd = buildFormData({
      paperId: paper.id,
      statement: "My own masterpiece",
    });
    const result = await createEndorsement(fd);

    expect(result.error).toContain("cannot endorse your own");

    const count = await db.endorsement.count({ where: { paperId: paper.id } });
    expect(count).toBe(0);
  });

  it("rejects duplicate endorsement from the same user on the same paper", async () => {
    const author = await createTestUser({ name: "Author" });
    const endorser = await createTestUser({
      name: "Endorser",
      reputationScore: 150,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs(endorser);
    const fd1 = buildFormData({
      paperId: paper.id,
      statement: "First endorsement",
    });
    const first = await createEndorsement(fd1);
    expect(first.success).toBe(true);

    const fd2 = buildFormData({
      paperId: paper.id,
      statement: "Duplicate endorsement",
    });
    const duplicate = await createEndorsement(fd2);
    expect(duplicate.error).toContain("already endorsed");

    const count = await db.endorsement.count({ where: { paperId: paper.id } });
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// createEndorsement — side effects (counts and reputation)
// ---------------------------------------------------------------------------

describe("createEndorsement — side effects", () => {
  it("increments paper.endorsementCount", async () => {
    const author = await createTestUser({ name: "Author" });
    const endorser = await createTestUser({
      name: "Endorser",
      reputationScore: 150,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    // Verify initial count is 0
    const before = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
    });
    expect(before.endorsementCount).toBe(0);

    setAuthenticatedAs(endorser);
    const fd = buildFormData({
      paperId: paper.id,
      statement: "Excellent work",
    });
    await createEndorsement(fd);

    const after = await db.paper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(after.endorsementCount).toBe(1);
  });

  it(`awards ENDORSEMENT_RECEIVED (${REPUTATION_POINTS.ENDORSEMENT_RECEIVED} points) to each paper author`, async () => {
    const author = await createTestUser({ name: "Author" });
    const endorser = await createTestUser({
      name: "Endorser",
      reputationScore: 150,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs(endorser);
    const fd = buildFormData({
      paperId: paper.id,
      statement: "Excellent work",
    });
    await createEndorsement(fd);

    // Check reputation event for the author
    const repEvent = await db.reputationEvent.findFirst({
      where: {
        userId: author.id,
        type: "ENDORSEMENT_RECEIVED",
        sourcePaperId: paper.id,
      },
    });
    expect(repEvent).not.toBeNull();
    expect(repEvent!.points).toBe(REPUTATION_POINTS.ENDORSEMENT_RECEIVED);

    // Check that author's reputationScore was incremented
    const updatedAuthor = await db.user.findUniqueOrThrow({
      where: { id: author.id },
    });
    expect(updatedAuthor.reputationScore).toBe(
      REPUTATION_POINTS.ENDORSEMENT_RECEIVED,
    );
  });

  it(`awards ENDORSEMENT_GIVEN (${REPUTATION_POINTS.ENDORSEMENT_GIVEN} points) to the endorser`, async () => {
    const author = await createTestUser({ name: "Author" });
    const endorser = await createTestUser({
      name: "Endorser",
      reputationScore: 150,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs(endorser);
    const fd = buildFormData({
      paperId: paper.id,
      statement: "Excellent work",
    });
    await createEndorsement(fd);

    // Check reputation event for the endorser
    const repEvent = await db.reputationEvent.findFirst({
      where: {
        userId: endorser.id,
        type: "ENDORSEMENT_GIVEN",
        sourcePaperId: paper.id,
      },
    });
    expect(repEvent).not.toBeNull();
    expect(repEvent!.points).toBe(REPUTATION_POINTS.ENDORSEMENT_GIVEN);

    // Check that endorser's reputationScore was incremented
    const updatedEndorser = await db.user.findUniqueOrThrow({
      where: { id: endorser.id },
    });
    expect(updatedEndorser.reputationScore).toBe(
      150 + REPUTATION_POINTS.ENDORSEMENT_GIVEN,
    );
  });

  it("trusted endorser (rep >= 500) awards PAPER_ENDORSED_BY_TRUSTED (20 points) instead", async () => {
    const author = await createTestUser({ name: "Author" });
    const trustedEndorser = await createTestUser({
      name: "Trusted Endorser",
      reputationScore: 500,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs(trustedEndorser);
    const fd = buildFormData({
      paperId: paper.id,
      statement: "Exceptional contribution",
    });
    await createEndorsement(fd);

    // Should NOT have an ENDORSEMENT_RECEIVED event
    const normalEvent = await db.reputationEvent.findFirst({
      where: {
        userId: author.id,
        type: "ENDORSEMENT_RECEIVED",
        sourcePaperId: paper.id,
      },
    });
    expect(normalEvent).toBeNull();

    // Should have a PAPER_ENDORSED_BY_TRUSTED event with 20 points
    const trustedEvent = await db.reputationEvent.findFirst({
      where: {
        userId: author.id,
        type: "PAPER_ENDORSED_BY_TRUSTED",
        sourcePaperId: paper.id,
      },
    });
    expect(trustedEvent).not.toBeNull();
    expect(trustedEvent!.points).toBe(20);

    // Author reputationScore should be 20 (started at 0)
    const updatedAuthor = await db.user.findUniqueOrThrow({
      where: { id: author.id },
    });
    expect(updatedAuthor.reputationScore).toBe(20);

    // Endorser should still get ENDORSEMENT_GIVEN
    const endorserEvent = await db.reputationEvent.findFirst({
      where: {
        userId: trustedEndorser.id,
        type: "ENDORSEMENT_GIVEN",
        sourcePaperId: paper.id,
      },
    });
    expect(endorserEvent).not.toBeNull();
    expect(endorserEvent!.points).toBe(REPUTATION_POINTS.ENDORSEMENT_GIVEN);

    const updatedEndorser = await db.user.findUniqueOrThrow({
      where: { id: trustedEndorser.id },
    });
    expect(updatedEndorser.reputationScore).toBe(
      500 + REPUTATION_POINTS.ENDORSEMENT_GIVEN,
    );
  });
});

// ---------------------------------------------------------------------------
// getEndorsements — query behaviour
// ---------------------------------------------------------------------------

describe("getEndorsements", () => {
  it("returns endorsements with endorser details", async () => {
    const author = await createTestUser({ name: "Author" });
    const endorser1 = await createTestUser({
      name: "Endorser One",
      reputationScore: 150,
    });
    const endorser2 = await createTestUser({
      name: "Endorser Two",
      reputationScore: 250,
    });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    // Create two endorsements
    setAuthenticatedAs(endorser1);
    await createEndorsement(
      buildFormData({ paperId: paper.id, statement: "Solid methodology" }),
    );

    setAuthenticatedAs(endorser2);
    await createEndorsement(
      buildFormData({ paperId: paper.id, statement: "Innovative approach" }),
    );

    const endorsements = await getEndorsements(paper.id);
    expect(endorsements).toHaveLength(2);

    // Ordered by createdAt desc, so endorser2's should be first
    const first = endorsements[0];
    const second = endorsements[1];

    // Check that endorser details are included
    expect(first.endorser.id).toBe(endorser2.id);
    expect(first.endorser.name).toBe("Endorser Two");
    expect(first.endorser.reputationScore).toBe(
      250 + REPUTATION_POINTS.ENDORSEMENT_GIVEN,
    );
    expect(first.statement).toBe("Innovative approach");
    expect(first.id).toBeDefined();
    expect(first.createdAt).toBeDefined();

    expect(second.endorser.id).toBe(endorser1.id);
    expect(second.endorser.name).toBe("Endorser One");
    expect(second.endorser.reputationScore).toBe(
      150 + REPUTATION_POINTS.ENDORSEMENT_GIVEN,
    );
    expect(second.statement).toBe("Solid methodology");

    // Verify endorser detail fields exist (even if null)
    for (const endorsement of endorsements) {
      expect(endorsement.endorser).toHaveProperty("id");
      expect(endorsement.endorser).toHaveProperty("name");
      expect(endorsement.endorser).toHaveProperty("avatarUrl");
      expect(endorsement.endorser).toHaveProperty("reputationScore");
      expect(endorsement.endorser).toHaveProperty("institution");
    }
  });
});
