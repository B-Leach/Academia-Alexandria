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
import { RedirectError } from "./setup";
import {
  createPaper,
  updatePaper,
  submitPaper,
  deletePaper,
  getPaper,
  getPapers,
} from "@/actions/paper";

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

// ===========================================================================
// createPaper
// ===========================================================================

describe("createPaper", () => {
  it("creates a paper with an author link in the database", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const fd = validPaperFormData();
    const result = await createPaper(fd);

    expect(result.success).toBe(true);
    expect(result.paperId).toBeDefined();

    // Verify paper exists in DB
    const paper = await db.paper.findUnique({
      where: { id: result.paperId! },
      include: { authors: true },
    });

    expect(paper).not.toBeNull();
    expect(paper!.title).toBe(
      "A Comprehensive Study of Integration Testing Patterns",
    );
    expect(paper!.status).toBe("DRAFT");
    expect(paper!.disciplines).toEqual(["computer-science"]);
    expect(paper!.keywords).toEqual(["testing", "integration"]);

    // Verify PaperAuthor link
    expect(paper!.authors).toHaveLength(1);
    expect(paper!.authors[0].userId).toBe(user.id);
    expect(paper!.authors[0].order).toBe(0);
    expect(paper!.authors[0].isCorresponding).toBe(true);
  });

  it("creates invitations (not PaperAuthors) for co-author IDs", async () => {
    const user = await createTestUser();
    const coAuthor = await createTestUser({
      email: "coauthor@example.com",
      name: "Co Author",
    });
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const fd = validPaperFormData({ coAuthorIds: coAuthor.id });
    const result = await createPaper(fd);

    expect(result.success).toBe(true);

    // Only the submitter should be a PaperAuthor
    const paper = await db.paper.findUnique({
      where: { id: result.paperId! },
      include: { authors: { orderBy: { order: "asc" } } },
    });

    expect(paper!.authors).toHaveLength(1);
    expect(paper!.authors[0].userId).toBe(user.id);
    expect(paper!.authors[0].isCorresponding).toBe(true);

    // Co-author should have a pending invitation
    const invitations = await db.coAuthorInvitation.findMany({
      where: { paperId: result.paperId! },
    });

    expect(invitations).toHaveLength(1);
    expect(invitations[0].inviteeId).toBe(coAuthor.id);
    expect(invitations[0].inviterId).toBe(user.id);
    expect(invitations[0].status).toBe("PENDING");
    expect(invitations[0].order).toBe(1);
  });

  it("returns an error when a co-author ID is not found", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const fd = validPaperFormData({ coAuthorIds: "nonexistent-user-id" });
    const result = await createPaper(fd);

    expect(result.error).toBe("One or more co-authors could not be found");
    expect(result.success).toBeUndefined();

    // No paper should have been created
    const paperCount = await db.paper.count();
    expect(paperCount).toBe(0);
  });
});

// ===========================================================================
// getPaper
// ===========================================================================

describe("getPaper", () => {
  it("returns full paper details with authors", async () => {
    const user = await createTestUser({
      name: "Jane Scholar",
      email: "jane@example.com",
    });
    const paper = await createTestPaper(user.id);

    const result = await getPaper(paper.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(paper.id);
    expect(result!.title).toBe(paper.title);
    expect(result!.abstract).toBe(paper.abstract);
    expect(result!.content).toBe(paper.content);
    expect(result!.status).toBe("DRAFT");
    expect(result!.disciplines).toEqual(["computer-science"]);
    expect(result!.keywords).toEqual(["testing", "integration"]);
    expect(result!.version).toBe(1);

    // Authors
    expect(result!.authors).toHaveLength(1);
    expect(result!.authors[0].userId).toBe(user.id);
    expect(result!.authors[0].user.name).toBe("Jane Scholar");
    expect(result!.authors[0].isCorresponding).toBe(true);
  });
});

// ===========================================================================
// getPapers
// ===========================================================================

describe("getPapers", () => {
  it("returns submitted and published papers but not drafts", async () => {
    const user = await createTestUser();

    await createTestPaper(user.id, {
      title: "Draft Paper Title Here",
    });
    const submitted = await createTestPaper(user.id, {
      title: "Submitted Paper Title Here",
    });
    const published = await createTestPaper(user.id, {
      title: "Published Paper Title Here",
    });

    await submitTestPaper(submitted.id);
    await submitTestPaper(published.id);
    await publishTestPaper(published.id);

    const result = await getPapers({});

    expect(result.papers).toHaveLength(2);

    const titles = result.papers.map((p) => p.title);
    expect(titles).toContain("Submitted Paper Title Here");
    expect(titles).toContain("Published Paper Title Here");
    expect(titles).not.toContain("Draft Paper Title Here");
    expect(result.totalCount).toBe(2);
  });
});

// ===========================================================================
// updatePaper
// ===========================================================================

describe("updatePaper", () => {
  it("updates the title and abstract of a draft paper", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const paper = await createTestPaper(user.id);

    const fd = buildFormData({
      title: "Updated Title for the Study",
      abstract:
        "This updated abstract reflects revised research findings and methodology improvements across multiple experiments.",
      content: paper.content || "",
      disciplines: ["computer-science"],
      keywords: "updated,keywords",
    });

    const result = await updatePaper(paper.id, fd);

    expect(result.success).toBe(true);

    const updated = await db.paper.findUnique({ where: { id: paper.id } });
    expect(updated!.title).toBe("Updated Title for the Study");
    expect(updated!.abstract).toContain("updated abstract");
    // Draft papers should not increment version
    expect(updated!.version).toBe(1);
  });

  it("increments version when updating a SUBMITTED paper", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const paper = await createTestPaper(user.id);
    await submitTestPaper(paper.id);

    const fd = buildFormData({
      title: "Revised Title After Submission Review",
      abstract:
        "This revised abstract reflects feedback received during the peer review process and addresses reviewer concerns.",
      content: paper.content || "",
      disciplines: ["computer-science"],
      keywords: "revised,submission",
    });

    const result = await updatePaper(paper.id, fd);

    expect(result.success).toBe(true);

    const updated = await db.paper.findUnique({ where: { id: paper.id } });
    expect(updated!.title).toBe("Revised Title After Submission Review");
    expect(updated!.version).toBe(2);
  });
});

// ===========================================================================
// submitPaper
// ===========================================================================

describe("submitPaper", () => {
  it("changes status to SUBMITTED, sets publishedAt, and redirects", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    // createTestPaper provides content that meets publishPaperSchema requirements
    const paper = await createTestPaper(user.id);

    try {
      await submitPaper(paper.id);
      // Should not reach here because redirect throws
      expect.unreachable("submitPaper should throw RedirectError");
    } catch (err) {
      expect(err).toBeInstanceOf(RedirectError);
      expect((err as RedirectError).url).toBe(`/papers/${paper.id}/published`);
    }

    const updated = await db.paper.findUnique({ where: { id: paper.id } });
    expect(updated!.status).toBe("SUBMITTED");
    expect(updated!.publishedAt).not.toBeNull();
  });

  it("rejects an incomplete paper that fails validation", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    // Create paper with a short abstract (< 50 chars) that fails publishPaperSchema
    const paper = await createTestPaper(user.id, {
      abstract: "Too short",
    });

    const result = await submitPaper(paper.id);

    expect(result!.error).toBe("Abstract must be at least 50 characters");

    // Paper should still be a draft
    const unchanged = await db.paper.findUnique({ where: { id: paper.id } });
    expect(unchanged!.status).toBe("DRAFT");
  });

  it("rejects submitting an already-submitted paper", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const paper = await createTestPaper(user.id);
    await submitTestPaper(paper.id);

    const result = await submitPaper(paper.id);

    expect(result!.error).toBe("Paper has already been submitted");
  });
});

// ===========================================================================
// deletePaper
// ===========================================================================

describe("deletePaper", () => {
  it("deletes a DRAFT paper and cascade-deletes author links", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const paper = await createTestPaper(user.id);

    // Confirm author link exists before deletion
    const authorsBefore = await db.paperAuthor.findMany({
      where: { paperId: paper.id },
    });
    expect(authorsBefore).toHaveLength(1);

    try {
      await deletePaper(paper.id);
      expect.unreachable("deletePaper should throw RedirectError");
    } catch (err) {
      expect(err).toBeInstanceOf(RedirectError);
      expect((err as RedirectError).url).toBe("/papers");
    }

    // Paper should be gone
    const deleted = await db.paper.findUnique({ where: { id: paper.id } });
    expect(deleted).toBeNull();

    // Author links should be cascade-deleted
    const authorsAfter = await db.paperAuthor.findMany({
      where: { paperId: paper.id },
    });
    expect(authorsAfter).toHaveLength(0);
  });

  it("rejects deletion of a PUBLISHED paper", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const paper = await createTestPaper(user.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    const result = await deletePaper(paper.id);

    expect(result.error).toBe(
      "Cannot delete a published or retracted paper. Contact a moderator.",
    );

    // Paper should still exist
    const stillExists = await db.paper.findUnique({ where: { id: paper.id } });
    expect(stillExists).not.toBeNull();
    expect(stillExists!.status).toBe("PUBLISHED");
  });
});
