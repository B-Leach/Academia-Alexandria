"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { resolveReport, bulkResolveReports } from "@/actions/report";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-700",
  RESOLVED: "bg-green-500/10 text-green-700",
  DISMISSED: "bg-muted text-muted-foreground",
};

const targetTypeLabels: Record<string, string> = {
  COMMENT: "Comment",
  REVIEW: "Review",
  PAPER: "Paper",
};

interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: Date;
  reporter: { id: string; name: string | null };
  resolvedBy: { name: string | null } | null;
}

export function BulkReportsTable({ reports }: { reports: Report[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === reports.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reports.map((r) => r.id)));
    }
  };

  const handleBulkAction = (action: "resolve" | "dismiss") => {
    startTransition(async () => {
      const result = await bulkResolveReports([...selected], action);
      if (result.error) {
        toast({ title: result.error, variant: "destructive" });
      } else {
        toast({
          title: `${action === "resolve" ? "Resolved" : "Dismissed"} ${result.count} reports`,
          variant: "success",
        });
        setSelected(new Set());
        router.refresh();
      }
    });
  };

  return (
    <>
      <BulkActionBar
        selectedCount={selected.size}
        actions={[
          { label: isPending ? "Processing..." : "Resolve Selected", onClick: () => handleBulkAction("resolve") },
          { label: "Dismiss Selected", variant: "outline", onClick: () => handleBulkAction("dismiss") },
        ]}
        onClear={() => setSelected(new Set())}
      />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={reports.length > 0 && selected.size === reports.length}
                  onChange={toggleAll}
                  aria-label="Select all reports"
                  className="rounded border-input"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">Reporter</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Reason</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                className={`border-b transition-colors hover:bg-muted/30 ${selected.has(report.id) ? "bg-muted/20" : ""}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(report.id)}
                    onChange={() => toggle(report.id)}
                    aria-label={`Select report from ${report.reporter.name}`}
                    className="rounded border-input"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${report.reporter.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {report.reporter.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {targetTypeLabels[report.targetType] ?? report.targetType}
                </td>
                <td className="max-w-xs px-4 py-3">
                  <p className="line-clamp-2 text-muted-foreground">
                    {report.reason}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge className={statusColors[report.status] ?? ""}>
                    {report.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDate(report.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {report.targetType === "PAPER" && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/papers/${report.targetId}`}>
                          View Paper
                        </Link>
                      </Button>
                    )}
                    {report.status === "PENDING" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            resolveReport(report.id, "resolve").then(() => router.refresh());
                          }}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => {
                            resolveReport(report.id, "dismiss").then(() => router.refresh());
                          }}
                        >
                          Dismiss
                        </Button>
                      </>
                    )}
                    {report.status !== "PENDING" && report.resolvedBy && (
                      <span className="text-xs text-muted-foreground">
                        by {report.resolvedBy.name}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No reports found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
