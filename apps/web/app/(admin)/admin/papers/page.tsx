import { getAdminPapers } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { BulkPapersTable } from "@/components/admin/bulk-papers-table";
import { isDoiEnabled } from "@/lib/crossref";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Admin - Papers",
};

export default async function AdminPapersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { papers, totalCount, totalPages, currentPage } = await getAdminPapers(params);
  const crossrefEnabled = isDoiEnabled();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Papers</h1>
        <p className="mt-2 text-muted-foreground">
          {totalCount} {totalCount === 1 ? "paper" : "papers"} total.
        </p>
      </div>

      {/* Status Filter */}
      <form className="flex gap-4" method="GET">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="PUBLISHED">Published</option>
          <option value="RETRACTED">Retracted</option>
        </select>
        <Button type="submit">Filter</Button>
        {params.status && (
          <Button variant="ghost" asChild>
            <Link href="/admin/papers">Clear</Link>
          </Button>
        )}
      </form>

      <BulkPapersTable papers={papers} crossrefEnabled={crossrefEnabled} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={{ pathname: "/admin/papers", query: { ...params, page: currentPage - 1 } }}>
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
              <Link href={{ pathname: "/admin/papers", query: { ...params, page: currentPage + 1 } }}>
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
