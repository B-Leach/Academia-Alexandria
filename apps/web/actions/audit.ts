"use server";

import { db } from "@/lib/db";
import { requireModerator } from "@/lib/require-user";

const LOGS_PER_PAGE = 20;

export async function getAuditLogs(
  searchParams: Record<string, string | undefined>,
) {
  await requireModerator();

  const action = searchParams.action ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * LOGS_PER_PAGE;

  const where: Record<string, unknown> = {};
  if (action) {
    where.action = action;
  }

  const [logs, totalCount] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: LOGS_PER_PAGE,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        user: {
          select: { id: true, name: true },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    totalCount,
    totalPages: Math.ceil(totalCount / LOGS_PER_PAGE),
    currentPage: page,
  };
}
