import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { PenSquare, Calendar, Edit, CheckCircle2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = {
  title: "My Papers",
};

export default async function MyPapersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const paperAuthors = await db.paperAuthor.findMany({
    where: { userId: session.user.id },
    select: {
      paper: {
        select: {
          id: true,
          title: true,
          abstract: true,
          status: true,
          disciplines: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { paper: { updatedAt: "desc" } },
  });

  const papers = paperAuthors.map((pa) => pa.paper);
  const drafts = papers.filter((p) => p.status === "DRAFT");
  const submitted = papers.filter((p) => p.status === "SUBMITTED");
  const published = papers.filter((p) => p.status === "PUBLISHED");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Papers</h1>
          <p className="mt-2 text-muted-foreground">
            {drafts.length} {drafts.length === 1 ? "draft" : "drafts"},{" "}
            {submitted.length} submitted,{" "}
            {published.length} peer reviewed
          </p>
        </div>
        <Button asChild>
          <Link href="/papers/new">
            <PenSquare className="mr-2 h-4 w-4" />
            New Paper
          </Link>
        </Button>
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Drafts</h2>
          <div className="space-y-3">
            {drafts.map((paper) => (
              <Card key={paper.id}>
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/papers/${paper.id}`}
                      className="font-medium hover:underline line-clamp-1"
                    >
                      {paper.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/50">
                        Draft
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Updated {formatRelativeTime(paper.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/papers/${paper.id}/edit`}>
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Submitted (Awaiting Review) */}
      {submitted.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Submitted — Awaiting Review</h2>
          <div className="space-y-3">
            {submitted.map((paper) => (
              <Card key={paper.id}>
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/papers/${paper.id}`}
                      className="font-medium hover:underline line-clamp-1"
                    >
                      {paper.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/50">
                        Submitted
                      </Badge>
                      {paper.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatRelativeTime(paper.publishedAt)}
                        </span>
                      )}
                      {paper.disciplines.length > 0 && (
                        <span className="hidden sm:inline">
                          {paper.disciplines.map((d) =>
                            d.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                          ).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/papers/${paper.id}`}>
                      View
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Published (Peer Reviewed) */}
      {published.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            Published — Peer Reviewed
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </h2>
          <div className="space-y-3">
            {published.map((paper) => (
              <Card key={paper.id}>
                <CardContent className="flex items-center justify-between py-5">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/papers/${paper.id}`}
                      className="font-medium hover:underline line-clamp-1"
                    >
                      {paper.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Peer Reviewed
                      </Badge>
                      {paper.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatRelativeTime(paper.publishedAt)}
                        </span>
                      )}
                      {paper.disciplines.length > 0 && (
                        <span className="hidden sm:inline">
                          {paper.disciplines.map((d) =>
                            d.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                          ).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/papers/${paper.id}`}>
                      View
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {papers.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
          You haven&apos;t written any papers yet.{" "}
          <Link href="/papers/new" className="text-primary hover:underline">
            Start your first paper
          </Link>
        </div>
      )}
    </div>
  );
}
