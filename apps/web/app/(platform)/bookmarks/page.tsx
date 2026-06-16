import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBookmarks } from "@/actions/bookmark";
import { PaperCard } from "@/components/papers/paper-card";
import { Button } from "@/components/ui/button";
import { Bookmark, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Bookmarks",
};

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const { papers, totalCount, totalPages } = await getBookmarks(page);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Bookmarks</h1>
        <p className="mt-2 text-muted-foreground">
          {totalCount} {totalCount === 1 ? "paper" : "papers"} saved for later.
        </p>
      </div>

      {papers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              isBookmarked={true}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-24 text-center">
          <Bookmark className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            No bookmarks yet
          </p>
          <p className="text-xs text-muted-foreground/70">
            Bookmark papers while{" "}
            <Link href="/papers" className="text-primary hover:underline">
              browsing
            </Link>{" "}
            to save them for later.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={{ pathname: "/bookmarks", query: { page: page - 1 } }}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={{ pathname: "/bookmarks", query: { page: page + 1 } }}>
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
