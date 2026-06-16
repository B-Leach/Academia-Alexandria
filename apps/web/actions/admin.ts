"use server";

import { db } from "@/lib/db";
import { requireModerator, requireAdmin } from "@/lib/require-user";
import { tryAcceptPaper } from "@/lib/paper-acceptance";
import { revalidatePath } from "next/cache";
import { rateLimitByUser } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { assignDoiToPaper, isDoiEnabled } from "@/lib/crossref";
import { dispatchWebhooks } from "@/lib/webhooks";

const USERS_PER_PAGE = 20;
const PAPERS_PER_PAGE = 20;

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getAdminStats() {
  await requireModerator();

  const [
    totalUsers,
    totalPapers,
    papersByStatus,
    totalReviews,
    totalEndorsements,
    recentUsers,
    recentPapers,
  ] = await Promise.all([
    db.user.count(),
    db.paper.count(),
    db.paper.groupBy({ by: ["status"], _count: true }),
    db.review.count(),
    db.endorsement.count(),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    db.paper.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        authors: {
          select: { user: { select: { name: true } }, order: true },
          orderBy: { order: "asc" },
          take: 1,
        },
      },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const group of papersByStatus) {
    statusCounts[group.status] = group._count;
  }

  return {
    totalUsers,
    totalPapers,
    statusCounts,
    totalReviews,
    totalEndorsements,
    recentUsers,
    recentPapers,
  };
}

// ============================================================
// REVENUE STATS (Admin-only)
// ============================================================

export async function getRevenueStats() {
  await requireAdmin();

  const [
    totalBounties,
    activeBounties,
    completedBounties,
    totalPlatformFeeCents,
    totalPayoutCents,
    pendingPayoutCents,
  ] = await Promise.all([
    db.bounty.count(),
    db.bounty.count({ where: { status: "ACTIVE" } }),
    db.bounty.count({ where: { status: "COMPLETED" } }),
    db.bounty.aggregate({ _sum: { platformFeeCents: true } }),
    db.bountyPayout.aggregate({
      where: { paidAt: { not: null } },
      _sum: { amountCents: true },
    }),
    db.bountyPayout.aggregate({
      where: { paidAt: null },
      _sum: { amountCents: true },
    }),
  ]);

  return {
    totalBounties,
    activeBounties,
    completedBounties,
    totalPlatformRevenueCents: totalPlatformFeeCents._sum.platformFeeCents ?? 0,
    totalPaidOutCents: totalPayoutCents._sum.amountCents ?? 0,
    pendingPayoutCents: pendingPayoutCents._sum.amountCents ?? 0,
  };
}

// ============================================================
// USER MANAGEMENT
// ============================================================

export async function getAdminUsers(
  searchParams: Record<string, string | undefined>,
) {
  await requireModerator();

  const query = searchParams.query?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * USERS_PER_PAGE;

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, totalCount] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: USERS_PER_PAGE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        reputationScore: true,
        createdAt: true,
        bannedAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  return {
    users,
    totalCount,
    totalPages: Math.ceil(totalCount / USERS_PER_PAGE),
    currentPage: page,
  };
}

export async function getAdminUser(userId: string) {
  await requireModerator();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      institution: true,
      bio: true,
      reputationScore: true,
      createdAt: true,
      bannedAt: true,
      bannedReason: true,
      _count: {
        select: {
          authoredPapers: true,
          reviews: true,
          endorsementsGiven: true,
          comments: true,
        },
      },
    },
  });

  return user;
}

export async function banUser(userId: string, reason: string) {
  const session = await requireAdmin();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return limited;

  if (userId === session.user.id) {
    return { error: "You cannot ban yourself" };
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, bannedAt: true },
  });

  if (!target) {
    return { error: "User not found" };
  }

  if (target.role === "ADMIN" || target.role === "MODERATOR") {
    return { error: "Cannot ban an admin or moderator" };
  }

  if (target.bannedAt) {
    return { error: "User is already banned" };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      bannedAt: new Date(),
      bannedReason: reason || "No reason provided",
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "BAN_USER",
    targetType: "USER",
    targetId: userId,
    metadata: { reason: reason || "No reason provided" },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");

  return { success: true };
}

export async function unbanUser(userId: string) {
  const session = await requireAdmin();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return limited;

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true },
  });

  if (!target) {
    return { error: "User not found" };
  }

  if (!target.bannedAt) {
    return { error: "User is not banned" };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      bannedAt: null,
      bannedReason: null,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "UNBAN_USER",
    targetType: "USER",
    targetId: userId,
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");

  return { success: true };
}

// ============================================================
// PAPER MODERATION
// ============================================================

export async function getAdminPapers(
  searchParams: Record<string, string | undefined>,
) {
  await requireModerator();

  const status = searchParams.status ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAPERS_PER_PAGE;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const [papers, totalCount] = await Promise.all([
    db.paper.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: PAPERS_PER_PAGE,
      select: {
        id: true,
        title: true,
        status: true,
        doi: true,
        similarityScore: true,
        plagiarismScore: true,
        plagiarismStatus: true,
        createdAt: true,
        authors: {
          select: { user: { select: { id: true, name: true } }, order: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.paper.count({ where }),
  ]);

  return {
    papers,
    totalCount,
    totalPages: Math.ceil(totalCount / PAPERS_PER_PAGE),
    currentPage: page,
  };
}

export async function retractPaper(paperId: string, reason: string) {
  const session = await requireAdmin();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return limited;

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { status: true },
  });

  if (!paper) {
    return { error: "Paper not found" };
  }

  if (paper.status === "DRAFT") {
    return { error: "Cannot retract a draft" };
  }

  if (paper.status === "RETRACTED") {
    return { error: "Paper is already retracted" };
  }

  await db.paper.update({
    where: { id: paperId },
    data: {
      status: "RETRACTED",
      retractedAt: new Date(),
      retractedReason: reason || "No reason provided",
      retractedById: session.user.id,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "RETRACT_PAPER",
    targetType: "PAPER",
    targetId: paperId,
    metadata: { reason: reason || "No reason provided" },
  });

  dispatchWebhooks("paper.retracted", { paperId, reason: reason || "No reason provided" }).catch(() => {});

  revalidatePath(`/papers/${paperId}`);
  revalidatePath("/admin/papers");
  revalidatePath("/papers");

  return { success: true };
}

// ============================================================
// COMMENT & REVIEW MODERATION
// ============================================================

export async function deleteCommentAdmin(commentId: string) {
  const session = await requireModerator();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return limited;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { paperId: true },
  });

  if (!comment) {
    return { error: "Comment not found" };
  }

  await db.$transaction(async (tx) => {
    const replyCount = await tx.comment.count({
      where: { parentId: commentId },
    });

    await tx.comment.deleteMany({
      where: { parentId: commentId },
    });

    await tx.comment.delete({
      where: { id: commentId },
    });

    await tx.paper.update({
      where: { id: comment.paperId },
      data: { commentCount: { decrement: 1 + replyCount } },
    });
  });

  await createAuditLog({
    userId: session.user.id,
    action: "DELETE_COMMENT",
    targetType: "COMMENT",
    targetId: commentId,
    metadata: { paperId: comment.paperId },
  });

  revalidatePath(`/papers/${comment.paperId}`);
  revalidatePath("/admin/reports");

  return { success: true };
}

export async function deleteReviewAdmin(reviewId: string) {
  const session = await requireModerator();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return limited;

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { paperId: true, paper: { select: { status: true } } },
  });

  if (!review) {
    return { error: "Review not found" };
  }

  if (review.paper.status === "PUBLISHED") {
    return { error: "Reviews on published papers cannot be deleted" };
  }

  await db.$transaction(async (tx) => {
    await tx.review.delete({
      where: { id: reviewId },
    });

    await tx.paper.update({
      where: { id: review.paperId },
      data: { reviewCount: { decrement: 1 } },
    });
  });

  await createAuditLog({
    userId: session.user.id,
    action: "DELETE_REVIEW",
    targetType: "REVIEW",
    targetId: reviewId,
    metadata: { paperId: review.paperId },
  });

  // Recalculate paper acceptance after removing a review on a submitted paper
  if (review.paper.status === "SUBMITTED") {
    await tryAcceptPaper(review.paperId);
  }

  revalidatePath(`/papers/${review.paperId}`);
  revalidatePath("/admin/reports");

  return { success: true };
}

// ============================================================
// ACCEPTANCE MODERATION
// ============================================================

// ============================================================
// DOI MANAGEMENT
// ============================================================

export async function assignDoi(paperId: string) {
  const session = await requireAdmin();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return limited;

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { status: true, doi: true },
  });

  if (!paper) return { error: "Paper not found" };
  if (paper.status !== "PUBLISHED") return { error: "Paper must be published" };
  if (paper.doi) return { error: "Paper already has a DOI" };

  if (!isDoiEnabled()) {
    return { error: "CrossRef integration is not configured" };
  }

  const result = await assignDoiToPaper(paperId);
  if (!result.success) return { error: result.error ?? "DOI assignment failed" };

  await createAuditLog({
    userId: session.user.id,
    action: "ASSIGN_DOI",
    targetType: "PAPER",
    targetId: paperId,
    metadata: { doi: result.doi },
  });

  revalidatePath(`/papers/${paperId}`);
  revalidatePath("/admin/papers");

  return { success: true, doi: result.doi };
}

export async function setManualDoi(paperId: string, doi: string) {
  const session = await requireAdmin();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return limited;

  const trimmedDoi = doi.trim();
  if (!trimmedDoi || !/^10\.\d{4,}\/\S+$/.test(trimmedDoi)) {
    return { error: "Invalid DOI format (expected 10.XXXX/...)" };
  }

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { status: true, doi: true },
  });

  if (!paper) return { error: "Paper not found" };
  if (paper.status !== "PUBLISHED") return { error: "Paper must be published" };
  if (paper.doi) return { error: "Paper already has a DOI" };

  const existing = await db.paper.findUnique({ where: { doi: trimmedDoi } });
  if (existing) return { error: "This DOI is already assigned to another paper" };

  await db.paper.update({
    where: { id: paperId },
    data: { doi: trimmedDoi },
  });

  await createAuditLog({
    userId: session.user.id,
    action: "ASSIGN_DOI",
    targetType: "PAPER",
    targetId: paperId,
    metadata: { doi: trimmedDoi, manual: true },
  });

  revalidatePath(`/papers/${paperId}`);
  revalidatePath("/admin/papers");

  return { success: true, doi: trimmedDoi };
}

// ============================================================
// BULK ACTIONS
// ============================================================

export async function bulkBanUsers(
  userIds: string[],
  reason: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  const session = await requireAdmin();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return { success: false, count: 0, error: limited.error };

  if (userIds.length === 0) return { success: true, count: 0 };
  if (userIds.length > 50) return { success: false, count: 0, error: "Maximum 50 at a time" };

  const users = await db.user.findMany({
    where: { id: { in: userIds }, bannedAt: null, role: "USER" },
    select: { id: true },
  });

  if (users.length === 0) return { success: true, count: 0 };

  const ids = users.map((u) => u.id);
  await db.user.updateMany({
    where: { id: { in: ids } },
    data: { bannedAt: new Date(), bannedReason: reason || "Bulk action" },
  });

  for (const id of ids) {
    await createAuditLog({
      userId: session.user.id,
      action: "BAN_USER",
      targetType: "USER",
      targetId: id,
      metadata: { reason, bulk: true },
    });
  }

  revalidatePath("/admin/users");

  return { success: true, count: ids.length };
}

export async function bulkUnbanUsers(
  userIds: string[],
): Promise<{ success: boolean; count: number; error?: string }> {
  const session = await requireAdmin();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return { success: false, count: 0, error: limited.error };

  if (userIds.length === 0) return { success: true, count: 0 };
  if (userIds.length > 50) return { success: false, count: 0, error: "Maximum 50 at a time" };

  const users = await db.user.findMany({
    where: { id: { in: userIds }, bannedAt: { not: null } },
    select: { id: true },
  });

  if (users.length === 0) return { success: true, count: 0 };

  const ids = users.map((u) => u.id);
  await db.user.updateMany({
    where: { id: { in: ids } },
    data: { bannedAt: null, bannedReason: null },
  });

  for (const id of ids) {
    await createAuditLog({
      userId: session.user.id,
      action: "UNBAN_USER",
      targetType: "USER",
      targetId: id,
      metadata: { bulk: true },
    });
  }

  revalidatePath("/admin/users");

  return { success: true, count: ids.length };
}

export async function bulkRetractPapers(
  paperIds: string[],
  reason: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  const session = await requireAdmin();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return { success: false, count: 0, error: limited.error };

  if (paperIds.length === 0) return { success: true, count: 0 };
  if (paperIds.length > 50) return { success: false, count: 0, error: "Maximum 50 at a time" };

  const papers = await db.paper.findMany({
    where: { id: { in: paperIds }, status: { in: ["SUBMITTED", "PUBLISHED"] } },
    select: { id: true },
  });

  if (papers.length === 0) return { success: true, count: 0 };

  const ids = papers.map((p) => p.id);
  await db.paper.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "RETRACTED",
      retractedAt: new Date(),
      retractedReason: reason || "Bulk action",
      retractedById: session.user.id,
    },
  });

  for (const id of ids) {
    await createAuditLog({
      userId: session.user.id,
      action: "RETRACT_PAPER",
      targetType: "PAPER",
      targetId: id,
      metadata: { reason, bulk: true },
    });
    dispatchWebhooks("paper.retracted", { paperId: id, reason }).catch(() => {});
  }

  revalidatePath("/admin/papers");
  revalidatePath("/papers");

  return { success: true, count: ids.length };
}
