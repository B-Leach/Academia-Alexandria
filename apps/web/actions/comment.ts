"use server";

import { requireVerifiedUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyCommentReceived } from "@/lib/email-notifications";
import { rateLimitByUser } from "@/lib/rate-limit";

const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment must be under 5000 characters"),
  paperId: z.string().min(1),
  parentId: z.string().optional(),
});

export interface CommentActionResult {
  error?: string;
  success?: boolean;
}

export async function createComment(
  formData: FormData,
): Promise<CommentActionResult> {
  const authResult = await requireVerifiedUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const raw = {
    content: formData.get("content") as string,
    paperId: formData.get("paperId") as string,
    parentId: (formData.get("parentId") as string) || undefined,
  };

  const parsed = createCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { content, paperId, parentId } = parsed.data;

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { status: true, version: true },
  });
  if (!paper) {
    return { error: "Paper not found" };
  }
  if (paper.status === "RETRACTED") {
    return { error: "Comments are disabled on retracted papers" };
  }
  if (paper.status !== "SUBMITTED" && paper.status !== "PUBLISHED") {
    return { error: "Paper is not available for comments" };
  }

  if (parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parentId },
      select: { paperId: true },
    });
    if (!parent || parent.paperId !== paperId) {
      return { error: "Parent comment not found" };
    }
  }

  const DUPLICATE_WINDOW_MS = 60_000;
  const duplicate = await db.comment.findFirst({
    where: {
      authorId: userId,
      paperId,
      content,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
  });
  if (duplicate) {
    return {
      error:
        "Duplicate comment. Please wait before posting the same content again.",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.comment.create({
      data: {
        content,
        paperId,
        authorId: userId,
        parentId,
        paperVersion: paper.version,
      },
    });

    await tx.paper.update({
      where: { id: paperId },
      data: { commentCount: { increment: 1 } },
    });
  });

  // Send email notification (fire-and-forget)
  notifyCommentReceived(paperId, userId, content, parentId).catch(() => {});

  revalidatePath(`/papers/${paperId}`);

  return { success: true };
}

export async function deleteComment(
  commentId: string,
): Promise<CommentActionResult> {
  const authResult = await requireVerifiedUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, paperId: true },
  });

  if (!comment) {
    return { error: "Comment not found" };
  }
  if (comment.authorId !== userId) {
    return { error: "You can only delete your own comments" };
  }

  await db.$transaction(async (tx) => {
    // Count replies before deleting so we decrement commentCount correctly
    const replyCount = await tx.comment.count({
      where: { parentId: commentId },
    });

    await tx.comment.deleteMany({
      where: { parentId: commentId },
    });

    await tx.comment.delete({ where: { id: commentId } });

    await tx.paper.update({
      where: { id: comment.paperId },
      data: { commentCount: { decrement: 1 + replyCount } },
    });
  });

  revalidatePath(`/papers/${comment.paperId}`);

  return { success: true };
}

export async function getComments(paperId: string) {
  const comments = await db.comment.findMany({
    where: { paperId, parentId: null },
    select: {
      id: true,
      content: true,
      createdAt: true,
      editedAt: true,
      paperVersion: true,
      author: {
        select: { id: true, name: true, honorific: true, avatarUrl: true },
      },
      replies: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          editedAt: true,
          paperVersion: true,
          author: {
            select: { id: true, name: true, honorific: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return comments;
}
