import { getAuditLogs } from "@/actions/audit";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Admin - Audit Log",
};

const ACTION_LABELS: Record<string, string> = {
  BAN_USER: "Ban User",
  UNBAN_USER: "Unban User",
  RETRACT_PAPER: "Retract Paper",
  DELETE_COMMENT: "Delete Comment",
  DELETE_REVIEW: "Delete Review",
  APPROVE_PAPER: "Approve Paper",
  BLOCK_ACCEPTANCE: "Block Acceptance",
  RESOLVE_REPORT: "Resolve Report",
  DISMISS_REPORT: "Dismiss Report",
  ASSIGN_DOI: "Assign DOI",
};

const ACTION_COLORS: Record<string, string> = {
  BAN_USER: "bg-red-500/10 text-red-700",
  UNBAN_USER: "bg-green-500/10 text-green-700",
  RETRACT_PAPER: "bg-red-500/10 text-red-700",
  DELETE_COMMENT: "bg-orange-500/10 text-orange-700",
  DELETE_REVIEW: "bg-orange-500/10 text-orange-700",
  APPROVE_PAPER: "bg-green-500/10 text-green-700",
  BLOCK_ACCEPTANCE: "bg-yellow-500/10 text-yellow-700",
  RESOLVE_REPORT: "bg-green-500/10 text-green-700",
  DISMISS_REPORT: "bg-muted text-muted-foreground",
  ASSIGN_DOI: "bg-blue-500/10 text-blue-700",
};

const TARGET_LINKS: Record<string, (id: string) => string> = {
  USER: (id) => `/admin/users/${id}`,
  PAPER: (id) => `/papers/${id}`,
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { logs, totalCount, totalPages, currentPage } =
    await getAuditLogs(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          {totalCount} total entries
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/audit"
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !params.action
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          All
        </Link>
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/audit?action=${key}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              params.action === key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Admin</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Target</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const targetLink = TARGET_LINKS[log.targetType]?.(log.targetId);
              const metadata = log.metadata as Record<string, unknown> | null;

              return (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${log.user.id}`}
                      className="hover:underline"
                    >
                      {log.user.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={ACTION_COLORS[log.action] ?? ""}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {targetLink ? (
                      <Link
                        href={targetLink}
                        className="font-mono text-xs hover:underline"
                      >
                        {log.targetType}/{log.targetId.slice(0, 8)}...
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.targetType}/{log.targetId.slice(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">
                    {metadata?.reason
                      ? String(metadata.reason)
                      : metadata
                        ? JSON.stringify(metadata)
                        : "—"}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No audit log entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/admin/audit?page=${currentPage - 1}${params.action ? `&action=${params.action}` : ""}`}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`/admin/audit?page=${currentPage + 1}${params.action ? `&action=${params.action}` : ""}`}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
