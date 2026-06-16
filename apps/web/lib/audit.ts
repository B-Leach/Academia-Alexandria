import { db } from "@/lib/db";
import type { AuditAction, AuditTargetType, Prisma } from "@academia-alexandria/database";

interface AuditLogParams {
  userId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}

type TxClient = Prisma.TransactionClient;

export async function createAuditLog(
  params: AuditLogParams,
  tx?: TxClient,
): Promise<void> {
  const client = tx ?? db;
  await client.auditLog.create({ data: params });
}
