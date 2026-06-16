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
} from "./helpers";
import { createComment, deleteComment, getComments } from "@/actions/comment";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
});

// ---------------------------------------------------------------------------
// createComment — basic behaviour
// ---------------------------------------------------------------------------

describe("createComment", () => {
  it("creates a comment on a SUBMITTED paper and persists it in the DB", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs(commenter);
    const fd = new FormData();
    fd.set("content", "This is a comment");
    fd.set("paperId", paper.id);

    const result = await createComment(fd);

    expect(result.success).toBe(true);

    const comment = await db.comment.findFirst({
      where: { paperId: paper.id, authorId: commenter.id },
    });
    expect(comment).not.toBeNull();
    expect(comment!.content).toBe("This is a comment");
    expect(comment!.paperId).toBe(paper.id);
    expect(comment!.authorId).toBe(commenter.id);
    expect(comment!.parentId).toBeNull();
  });

  it("creates a comment on a PUBLISHED paper", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);
    await publishTestPaper(paper.id);

    setAuthenticatedAs(commenter);
    const fd = new FormData();
    fd.set("content", "Comment on published paper");
    fd.set("paperId", paper.id);

    const result = await createComment(fd);

    expect(result.success).toBe(true);

    const comment = await db.comment.findFirst({
      where: { paperId: paper.id, authorId: commenter.id },
    });
    expect(comment).not.toBeNull();
    expect(comment!.content).toBe("Comment on published paper");
  });

  it("rejects a comment on a DRAFT paper", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const paper = await createTestPaper(author.id); // DRAFT by default

    setAuthenticatedAs(commenter);
    const fd = new FormData();
    fd.set("content", "Should not be allowed");
    fd.set("paperId", paper.id);

    const result = await createComment(fd);

    expect(result.error).toBeDefined();
    expect(result.error).toContain("not available for comments");

    const count = await db.comment.count({ where: { paperId: paper.id } });
    expect(count).toBe(0);
  });

  it("increments paper.commentCount after creating a comment", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs(commenter);

    // First comment
    const fd1 = new FormData();
    fd1.set("content", "First comment");
    fd1.set("paperId", paper.id);
    await createComment(fd1);

    let updated = await db.paper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(updated.commentCount).toBe(1);

    // Second comment
    const fd2 = new FormData();
    fd2.set("content", "Second comment");
    fd2.set("paperId", paper.id);
    await createComment(fd2);

    updated = await db.paper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(updated.commentCount).toBe(2);
  });

  it("captures the current paperVersion on the comment", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Get the paper's current version
    const currentPaper = await db.paper.findUniqueOrThrow({
      where: { id: paper.id },
      select: { version: true },
    });

    setAuthenticatedAs(commenter);
    const fd = new FormData();
    fd.set("content", "Versioned comment");
    fd.set("paperId", paper.id);

    await createComment(fd);

    const comment = await db.comment.findFirst({
      where: { paperId: paper.id, authorId: commenter.id },
    });
    expect(comment).not.toBeNull();
    expect(comment!.paperVersion).toBe(currentPaper.version);
  });

  it("creates a threaded reply with parentId and verifies parent-child relationship", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const replier = await createTestUser({ name: "Replier" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Create parent comment
    setAuthenticatedAs(commenter);
    const parentFd = new FormData();
    parentFd.set("content", "This is the parent comment");
    parentFd.set("paperId", paper.id);
    await createComment(parentFd);

    const parentComment = await db.comment.findFirst({
      where: { paperId: paper.id, authorId: commenter.id },
    });
    expect(parentComment).not.toBeNull();

    // Create reply
    setAuthenticatedAs(replier);
    const replyFd = new FormData();
    replyFd.set("content", "This is a reply");
    replyFd.set("paperId", paper.id);
    replyFd.set("parentId", parentComment!.id);
    await createComment(replyFd);

    const reply = await db.comment.findFirst({
      where: { paperId: paper.id, authorId: replier.id },
    });
    expect(reply).not.toBeNull();
    expect(reply!.parentId).toBe(parentComment!.id);
    expect(reply!.content).toBe("This is a reply");
  });

  it("rejects a reply with an invalid parentId", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    setAuthenticatedAs(commenter);
    const fd = new FormData();
    fd.set("content", "Reply to non-existent parent");
    fd.set("paperId", paper.id);
    fd.set("parentId", "non-existent-comment-id");

    const result = await createComment(fd);

    expect(result.error).toBeDefined();
    expect(result.error).toContain("Parent comment not found");

    const count = await db.comment.count({ where: { paperId: paper.id } });
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getComments — comment tree
// ---------------------------------------------------------------------------

describe("getComments", () => {
  it("returns a comment tree with replies nested under their parent", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter1 = await createTestUser({ name: "Commenter One" });
    const commenter2 = await createTestUser({ name: "Commenter Two" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Create first top-level comment
    setAuthenticatedAs(commenter1);
    const parentFd = new FormData();
    parentFd.set("content", "Top-level comment");
    parentFd.set("paperId", paper.id);
    await createComment(parentFd);

    const parentComment = await db.comment.findFirst({
      where: { paperId: paper.id, authorId: commenter1.id },
    });

    // Create a reply to the first comment
    setAuthenticatedAs(commenter2);
    const replyFd = new FormData();
    replyFd.set("content", "A nested reply");
    replyFd.set("paperId", paper.id);
    replyFd.set("parentId", parentComment!.id);
    await createComment(replyFd);

    // Create a second top-level comment
    setAuthenticatedAs(commenter2);
    const secondFd = new FormData();
    secondFd.set("content", "Another top-level comment");
    secondFd.set("paperId", paper.id);
    await createComment(secondFd);

    const comments = await getComments(paper.id);

    // Should return 2 top-level comments (parentId=null), ordered by createdAt desc
    expect(comments).toHaveLength(2);

    // Most recent top-level comment first (createdAt desc)
    expect(comments[0].content).toBe("Another top-level comment");
    expect(comments[0].author.id).toBe(commenter2.id);
    expect(comments[0].author.name).toBe("Commenter Two");
    expect(comments[0].replies).toHaveLength(0);

    // Older top-level comment second, with its reply nested
    expect(comments[1].content).toBe("Top-level comment");
    expect(comments[1].author.id).toBe(commenter1.id);
    expect(comments[1].replies).toHaveLength(1);
    expect(comments[1].replies[0].content).toBe("A nested reply");
    expect(comments[1].replies[0].author.id).toBe(commenter2.id);
  });
});

// ---------------------------------------------------------------------------
// deleteComment — deletion and cascading
// ---------------------------------------------------------------------------

describe("deleteComment", () => {
  it("deletes a comment and cascades to child replies, removing both from DB", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const replier = await createTestUser({ name: "Replier" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Create parent comment
    setAuthenticatedAs(commenter);
    const parentFd = new FormData();
    parentFd.set("content", "Parent to be deleted");
    parentFd.set("paperId", paper.id);
    await createComment(parentFd);

    const parentComment = await db.comment.findFirst({
      where: { paperId: paper.id, authorId: commenter.id },
    });

    // Create reply
    setAuthenticatedAs(replier);
    const replyFd = new FormData();
    replyFd.set("content", "Reply that should also be deleted");
    replyFd.set("paperId", paper.id);
    replyFd.set("parentId", parentComment!.id);
    await createComment(replyFd);

    // Verify both exist
    let totalComments = await db.comment.count({ where: { paperId: paper.id } });
    expect(totalComments).toBe(2);

    // Delete the parent comment (as the parent comment's author)
    setAuthenticatedAs(commenter);
    const result = await deleteComment(parentComment!.id);
    expect(result.success).toBe(true);

    // Both the parent and child reply should be gone
    totalComments = await db.comment.count({ where: { paperId: paper.id } });
    expect(totalComments).toBe(0);

    const deletedParent = await db.comment.findUnique({
      where: { id: parentComment!.id },
    });
    expect(deletedParent).toBeNull();
  });

  it("decrements paper.commentCount when a comment is deleted", async () => {
    const author = await createTestUser({ name: "Author" });
    const commenter = await createTestUser({ name: "Commenter" });
    const paper = await createTestPaper(author.id);
    await submitTestPaper(paper.id);

    // Create two comments
    setAuthenticatedAs(commenter);
    const fd1 = new FormData();
    fd1.set("content", "First comment");
    fd1.set("paperId", paper.id);
    await createComment(fd1);

    const fd2 = new FormData();
    fd2.set("content", "Second comment");
    fd2.set("paperId", paper.id);
    await createComment(fd2);

    let updated = await db.paper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(updated.commentCount).toBe(2);

    // Find and delete the first comment
    const firstComment = await db.comment.findFirst({
      where: { paperId: paper.id, content: "First comment" },
    });

    const result = await deleteComment(firstComment!.id);
    expect(result.success).toBe(true);

    updated = await db.paper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(updated.commentCount).toBe(1);
  });
});
