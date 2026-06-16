import { getPapers } from "@/actions/paper";
import { getBookmarkedPaperIds } from "@/actions/bookmark";
import { PaperCard } from "@/components/papers/paper-card";
import { PaperFilters } from "@/components/papers/paper-filters";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Papers",
  description: "Browse and search academic papers",
};

export default async function PapersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [{ papers, totalCount, totalPages, currentPage }, bookmarkedIds] =
    await Promise.all([getPapers(params), getBookmarkedPaperIds()]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Papers</h1>
          <p className="mt-2 text-muted-foreground">
            {totalCount} {totalCount === 1 ? "paper" : "papers"} across all
            disciplines.
          </p>
        </div>
        <Button asChild>
          <Link href="/papers/new">
            <FileText className="mr-2 h-4 w-4" />
            Submit Paper
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <PaperFilters params={params} />

      {/* Results */}
      {papers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              isBookmarked={bookmarkedIds.has(paper.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-24 text-center">
          <Search className="h-10 w-10 text-muted-foreground/40" />
          {params.query ||
          (params.discipline && params.discipline !== "all") ||
          (params.status && params.status !== "all") ||
          params.dateFrom ||
          params.dateTo ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">
                No papers match your search
              </p>
              <p className="text-xs text-muted-foreground/70">
                Try different keywords or{" "}
                <Link href="/papers" className="text-primary hover:underline">
                  clear all filters
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground">
                No papers yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Be the first to{" "}
                <Link
                  href="/papers/new"
                  className="text-primary hover:underline"
                >
                  submit a paper
                </Link>
              </p>
            </>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={{
                  pathname: "/papers",
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
                  pathname: "/papers",
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
