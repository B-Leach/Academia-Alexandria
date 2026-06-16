import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import { setAuthenticated, setUnauthenticated } from "../helpers/mock-auth";
import { buildFormData } from "../helpers/form-data";
import { revalidatePath } from "next/cache";

import { createComment, deleteComment } from "@/actions/comment";

beforeEach(() => {
  setAuthenticated();
  vi.mocked(revalidatePath).mockReset();
});

// -----------------------------------------------------------------------
// createComment
// -----------------------------------------------------------------------
describe("createComment", () => {
  const validForm = () =>
    buildFormData({
      content: "Great paper, thanks for sharing!",
      paperId: "paper-1",
    });

  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await createComment(validForm());
    expect(result.error).toContain("signed in");
  });

  it("should return error for empty comment content", async () => {
    const fd = buildFormData({ content: "", paperId: "paper-1" });
    const result = await createComment(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error for comment over 5000 characters", async () => {
    const fd = buildFormData({ content: "a".repeat(5001), paperId: "paper-1" });
    const result = await createComment(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error when paper not found", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(null);
    const result = await createComment(validForm());
    expect(result.error).toContain("not found");
  });

  it("should return error when paper is DRAFT", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "DRAFT",
      version: 1,
    } as any);
    const result = await createComment(validForm());
    expect(result.error).toContain("not available for comments");
  });

  it("should return error when paper is RETRACTED", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "RETRACTED",
      version: 1,
    } as any);
    const result = await createComment(validForm());
    expect(result.error).toContain("disabled on retracted");
  });

  it("should create comment on SUBMITTED paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      version: 1,
    } as any);
    prismaMock.comment.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    const result = await createComment(validForm());
    expect(result.success).toBe(true);
  });

  it("should create comment on PUBLISHED paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "PUBLISHED",
      version: 2,
    } as any);
    prismaMock.comment.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    const result = await createComment(validForm());
    expect(result.success).toBe(true);
  });

  it("should increment paper commentCount", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      version: 1,
    } as any);
    prismaMock.comment.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await createComment(validForm());
    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { commentCount: { increment: 1 } },
      }),
    );
  });

  it("should return error for duplicate comment within 60 seconds", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      version: 1,
    } as any);
    prismaMock.comment.findFirst.mockResolvedValue({ id: "existing" } as any);

    const result = await createComment(validForm());
    expect(result.error).toContain("Duplicate comment");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should create threaded reply when parentId is provided", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      version: 1,
    } as any);
    prismaMock.comment.findUnique.mockResolvedValue({
      paperId: "paper-1",
    } as any);
    prismaMock.comment.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    const fd = buildFormData({
      content: "Reply to parent",
      paperId: "paper-1",
      parentId: "comment-1",
    });

    const result = await createComment(fd);
    expect(result.success).toBe(true);
  });

  it("should return error when parent comment does not exist", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      version: 1,
    } as any);
    prismaMock.comment.findUnique.mockResolvedValue(null);

    const fd = buildFormData({
      content: "Reply to parent",
      paperId: "paper-1",
      parentId: "nonexistent",
    });

    const result = await createComment(fd);
    expect(result.error).toContain("Parent comment not found");
  });

  it("should return error when parent comment is on a different paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      version: 1,
    } as any);
    prismaMock.comment.findUnique.mockResolvedValue({
      paperId: "other-paper",
    } as any);

    const fd = buildFormData({
      content: "Reply",
      paperId: "paper-1",
      parentId: "comment-1",
    });

    const result = await createComment(fd);
    expect(result.error).toContain("Parent comment not found");
  });

  it("should capture paperVersion from the current paper version", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      version: 3,
    } as any);
    prismaMock.comment.findFirst.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await createComment(validForm());

    const createCall = prismaMock.comment.create.mock.calls[0][0];
    expect(createCall.data.paperVersion).toBe(3);
  });
});

// -----------------------------------------------------------------------
// deleteComment
// -----------------------------------------------------------------------
describe("deleteComment", () => {
  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await deleteComment("c1");
    expect(result.error).toContain("signed in");
  });

  it("should return error when comment not found", async () => {
    prismaMock.comment.findUnique.mockResolvedValue(null);
    const result = await deleteComment("c1");
    expect(result.error).toBe("Comment not found");
  });

  it("should return error when user is not the comment author", async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      authorId: "other-user",
      paperId: "p1",
    } as any);
    const result = await deleteComment("c1");
    expect(result.error).toContain("only delete your own");
  });

  it("should delete comment successfully", async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      authorId: "user-1",
      paperId: "p1",
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.deleteMany.mockResolvedValue({} as any);
    prismaMock.comment.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    const result = await deleteComment("c1");
    expect(result.success).toBe(true);
  });

  it("should cascade delete child replies", async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      authorId: "user-1",
      paperId: "p1",
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.deleteMany.mockResolvedValue({} as any);
    prismaMock.comment.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await deleteComment("c1");
    expect(prismaMock.comment.deleteMany).toHaveBeenCalledWith({
      where: { parentId: "c1" },
    });
  });

  it("should decrement paper commentCount including replies", async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      authorId: "user-1",
      paperId: "p1",
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.count.mockResolvedValue(2); // 2 replies
    prismaMock.comment.deleteMany.mockResolvedValue({} as any);
    prismaMock.comment.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await deleteComment("c1");
    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { commentCount: { decrement: 3 } }, // 1 + 2 replies
      }),
    );
  });

  it("should call revalidatePath for the paper", async () => {
    prismaMock.comment.findUnique.mockResolvedValue({
      authorId: "user-1",
      paperId: "p1",
    } as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.comment.deleteMany.mockResolvedValue({} as any);
    prismaMock.comment.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await deleteComment("c1");
    expect(revalidatePath).toHaveBeenCalledWith("/papers/p1");
  });
});
