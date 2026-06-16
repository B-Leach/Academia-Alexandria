import { getAdminReports } from "@/actions/report";
import { Button } from "@/components/ui/button";
import { BulkReportsTable } from "@/components/admin/bulk-reports-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Admin - Reports",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { reports, totalCount, pendingCount, totalPages, currentPage } =
    await getAdminReports(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="mt-2 text-muted-foreground">
          {totalCount} {totalCount === 1 ? "report" : "reports"} total
          {pendingCount > 0 && (
            <span className="ml-1 font-medium text-yellow-700 dark:text-yellow-400">
              ({pendingCount} pending)
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-4" method="GET">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
        <select
          name="targetType"
          defaultValue={params.targetType ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Types</option>
          <option value="COMMENT">Comment</option>
          <option value="REVIEW">Review</option>
          <option value="PAPER">Paper</option>
        </select>
        <Button type="submit">Filter</Button>
        {(params.status || params.targetType) && (
          <Button variant="ghost" asChild>
            <Link href="/admin/reports">Clear</Link>
          </Button>
        )}
      </form>

      <BulkReportsTable reports={reports} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={{
                  pathname: "/admin/reports",
                  query: { ...params, page: currentPage - 1 },
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={{
                  pathname: "/admin/reports",
                  query: { ...params, page: currentPage + 1 },
                }}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
