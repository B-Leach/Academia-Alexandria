"use server";

import { db } from "@/lib/db";
import { requireUser, requireModerator } from "@/lib/require-user";
import { rateLimitByUser } from "@/lib/rate-limit";
import { tryAcceptPaper } from "@/lib/paper-acceptance";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const REPORTS_PER_PAGE = 20;

const createReportSchema = z.object({
  targetType: z.enum(["COMMENT", "REVIEW", "PAPER"]),
  targetId: z.string().min(1),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(2000),
});

export type ReportActionResult = {
  success?: boolean;
  error?: string;
};

export async function createReport(
  formData: FormData,
): Promise<ReportActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const raw = {
    targetType: formData.get("targetType") as string,
    targetId: formData.get("targetId") as string,
    reason: formData.get("reason") as string,
  };

  const parsed = createReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }
  const data = parsed.data;

  // Validate target exists
  let targetExists = false;
  switch (data.targetType) {
    case "PAPER":
      targetExists = !!(await db.paper.findUnique({ where: { id: data.targetId }, select: { id: true } }));
      break;
    case "REVIEW":
      targetExists = !!(await db.review.findUnique({ where: { id: data.targetId }, select: { id: true } }));
      break;
    case "COMMENT":
      targetExists = !!(await db.comment.findUnique({ where: { id: data.targetId }, select: { id: true } }));
      break;
  }
  if (!targetExists) {
    return { error: "The content you are trying to report was not found" };
  }

  // Prevent duplicate pending reports from same user on same target
  const existing = await db.report.findFirst({
    where: {
      reporterId: userId,
      targetType: data.targetType,
      targetId: data.targetId,
      status: "PENDING",
    },
  });

  if (existing) {
    return { error: "You have already reported this content" };
  }

  await db.report.create({
    data: {
      reporterId: userId,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
    },
  });

  return { success: true };
}

// ============================================================
// ADMIN
// ============================================================

export async function getAdminReports(
  searchParams: Record<string, string | undefined>,
) {
  await requireModerator();

  const status = searchParams.status ?? "";
  const targetType = searchParams.targetType ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * REPORTS_PER_PAGE;

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }
  if (targetType) {
    where.targetType = targetType;
  }

  const [reports, totalCount, pendingCount] = await Promise.all([
    db.report.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: offset,
      take: REPORTS_PER_PAGE,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
        reporter: {
          select: { id: true, name: true },
        },
        resolvedBy: {
          select: { name: true },
        },
        resolvedAt: true,
      },
    }),
    db.report.count({ where }),
    db.report.count({ where: { status: "PENDING" } }),
  ]);

  return {
    reports,
    totalCount,
    pendingCount,
    totalPages: Math.ceil(totalCount / REPORTS_PER_PAGE),
    currentPage: page,
  };
}

export async function resolveReport(
  reportId: string,
  action: "resolve" | "dismiss",
): Promise<ReportActionResult> {
  const session = await requireModerator();

  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return limited;

  const report = await db.report.findUnique({
    where: { id: reportId },
    select: { status: true, targetType: true, targetId: true },
  });

  if (!report) {
    return { error: "Report not found" };
  }

  if (report.status !== "PENDING") {
    return { error: "Report has already been handled" };
  }

  await db.report.update({
    where: { id: reportId },
    data: {
      status: action === "resolve" ? "RESOLVED" : "DISMISSED",
      resolvedAt: new Date(),
      resolvedById: session.user.id,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    action: action === "resolve" ? "RESOLVE_REPORT" : "DISMISS_REPORT",
    targetType: "REPORT",
    targetId: reportId,
    metadata: { originalTargetType: report.targetType, originalTargetId: report.targetId },
  });

  if (report.targetType === "REVIEW") {
    const review = await db.review.findUnique({
      where: { id: report.targetId },
      select: { paperId: true, paper: { select: { status: true } } },
    });
    if (review?.paper.status === "SUBMITTED") {
      await tryAcceptPaper(review.paperId);
      revalidatePath(`/papers/${review.paperId}`);
    }
  }

  revalidatePath("/admin/reports");

  return { success: true };
}

export async function bulkResolveReports(
  reportIds: string[],
  action: "resolve" | "dismiss",
): Promise<{ success: boolean; count: number; error?: string }> {
  const session = await requireModerator();
  const limited = await rateLimitByUser("admin", session.user.id);
  if (limited) return { success: false, count: 0, error: limited.error };

  if (reportIds.length === 0) return { success: true, count: 0 };
  if (reportIds.length > 50) return { success: false, count: 0, error: "Maximum 50 at a time" };

  const reports = await db.report.findMany({
    where: { id: { in: reportIds }, status: "PENDING" },
    select: { id: true, targetType: true, targetId: true },
  });

  if (reports.length === 0) return { success: true, count: 0 };

  const status = action === "resolve" ? "RESOLVED" : "DISMISSED";

  await db.report.updateMany({
    where: { id: { in: reports.map((r) => r.id) } },
    data: { status, resolvedById: session.user.id, resolvedAt: new Date() },
  });

  for (const report of reports) {
    await createAuditLog({
      userId: session.user.id,
      action: action === "resolve" ? "RESOLVE_REPORT" : "DISMISS_REPORT",
      targetType: "REPORT",
      targetId: report.id,
      metadata: {
        originalTarget: `${report.targetType}:${report.targetId}`,
        bulk: true,
      },
    });
  }

  // Re-evaluate acceptance for any resolved review reports
  const reviewReports = reports.filter((r) => r.targetType === "REVIEW");
  for (const report of reviewReports) {
    const review = await db.review.findUnique({
      where: { id: report.targetId },
      select: { paperId: true, paper: { select: { status: true } } },
    });
    if (review?.paper.status === "SUBMITTED") {
      await tryAcceptPaper(review.paperId);
      revalidatePath(`/papers/${review.paperId}`);
    }
  }

  revalidatePath("/admin/reports");

  return { success: true, count: reports.length };
}
