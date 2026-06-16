import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReputationHistory } from "@/actions/reputation";
import { getMyInvitations } from "@/actions/invitation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { InvitationCard } from "@/components/dashboard/invitation-card";
import {
  FileText,
  MessageSquare,
  Star,
  ThumbsUp,
  PenSquare,
  Eye,
  Users,
  Search,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  PAPER_ACCEPTED: "Paper accepted (peer reviewed)",
  REVIEW_SUBMITTED: "Submitted a qualifying review",
  ENDORSEMENT_RECEIVED: "Received an endorsement",
  ENDORSEMENT_GIVEN: "Endorsed a paper",
  BOUNTY_REVIEW_COMPLETED: "Completed a bounty review",
  PAPER_ENDORSED_BY_TRUSTED: "Endorsed by trusted reviewer",
};

export const metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const [
    paperCount,
    reviewCount,
    endorsementsReceived,
    user,
    recentPapers,
    recentActivity,
    pendingInvitations,
    userResearchAreas,
  ] = await Promise.all([
    db.paperAuthor.count({
      where: { userId: session.user.id, paper: { status: "PUBLISHED" } },
    }),
    db.review.count({
      where: { reviewerId: session.user.id },
    }),
    db.reputationEvent.count({
      where: {
        userId: session.user.id,
        type: { in: ["ENDORSEMENT_RECEIVED", "PAPER_ENDORSED_BY_TRUSTED"] },
      },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, reputationScore: true },
    }),
    db.paperAuthor.findMany({
      where: { userId: session.user.id },
      select: {
        paper: {
          select: {
            id: true,
            title: true,
            status: true,
            publishedAt: true,
            createdAt: true,
            commentCount: true,
            reviewCount: true,
          },
        },
      },
      orderBy: { paper: { createdAt: "desc" } },
      take: 5,
    }),
    getReputationHistory(session.user.id),
    getMyInvitations(),
    db.userResearchArea.findMany({
      where: { userId: session.user.id },
      select: { researchAreaId: true },
    }),
  ]);

  // Review queue: SUBMITTED papers in user's research areas they haven't reviewed
  const researchAreaIds = userResearchAreas.map((ra) => ra.researchAreaId);
  const reviewQueue =
    researchAreaIds.length > 0
      ? await db.paper.findMany({
          where: {
            status: "SUBMITTED",
            researchAreas: {
              some: { researchAreaId: { in: researchAreaIds } },
            },
            authors: { none: { userId: session.user.id } },
            reviews: { none: { reviewerId: session.user.id } },
            reviewCount: { lt: 2 },
          },
          select: {
            id: true,
            title: true,
            disciplines: true,
            reviewCount: true,
            createdAt: true,
          },
          orderBy: { reviewCount: "asc" },
          take: 5,
        })
      : [];

  const papers = recentPapers.map((rp) => rp.paper);
  const recentEvents = recentActivity.slice(0, 5);

  const statusLabel = (status: string) => {
    if (status === "PUBLISHED") return "Peer Reviewed";
    if (status === "SUBMITTED") return "Submitted";
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name?.split(" ")[0] ?? "Researcher"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here&apos;s an overview of your academic activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/papers/new">
            <PenSquare className="mr-2 h-4 w-4" />
            New Paper
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Peer Reviewed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(paperCount)}</div>
            <p className="text-xs text-muted-foreground">Accepted papers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Reviews Written
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(reviewCount)}</div>
            <p className="text-xs text-muted-foreground">
              Formal reviews contributed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Endorsements</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(endorsementsReceived)}</div>
            <p className="text-xs text-muted-foreground">
              Endorsements received
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reputation</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(user?.reputationScore ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total reputation points
            </p>
          </CardContent>
        </Card>
      </div>

      {paperCount === 0 && reviewCount === 0 && researchAreaIds.length === 0 && (
        <GettingStartedCard userId={session.user.id} />
      )}

      {/* Pending Co-Author Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Co-Author Invitations
            </CardTitle>
            <CardDescription>
              You&apos;ve been invited as co-author on{" "}
              {pendingInvitations.length} paper
              {pendingInvitations.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pendingInvitations.map((inv) => (
                <InvitationCard key={inv.id} invitation={inv} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Papers Seeking Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Papers Seeking Review
          </CardTitle>
          <CardDescription>
            Papers in your research areas that need peer review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {researchAreaIds.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              <Link href="/settings" className="text-primary hover:underline">
                Set your research areas
              </Link>{" "}
              in Settings to see papers seeking review.
            </p>
          ) : reviewQueue.length > 0 ? (
            <div className="space-y-1">
              {reviewQueue.map((paper) => (
                <Link
                  key={paper.id}
                  href={`/papers/${paper.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <span className="font-medium truncate block">
                      {paper.title}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {paper.disciplines.slice(0, 2).map((d) => (
                        <Badge
                          key={d}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {d
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      ))}
                      <span>{formatRelativeTime(paper.createdAt)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {paper.reviewCount}/2 reviews
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No papers in your research areas need review right now.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Papers */}
        <Card>
          <CardHeader>
            <CardTitle>Your Papers</CardTitle>
            <CardDescription>
              Recent papers you&apos;ve authored
            </CardDescription>
          </CardHeader>
          <CardContent>
            {papers.length > 0 ? (
              <div className="space-y-1">
                {papers.map((paper) => (
                  <Link
                    key={paper.id}
                    href={`/papers/${paper.id}`}
                    className="flex items-center justify-between rounded-md px-3 py-3 text-sm transition-colors hover:bg-accent"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <span className="font-medium truncate block">
                        {paper.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant={
                            paper.status === "PUBLISHED"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {statusLabel(paper.status)}
                        </Badge>
                        <span>
                          {formatRelativeTime(
                            paper.publishedAt ?? paper.createdAt,
                          )}
                        </span>
                      </div>
                    </div>
                    {(paper.status === "SUBMITTED" ||
                      paper.status === "PUBLISHED") && (
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="h-3 w-3" />
                          {paper.commentCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3" />
                          {paper.reviewCount}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No papers yet.{" "}
                <Link
                  href="/papers/new"
                  className="text-primary hover:underline"
                >
                  Start your first paper
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Reputation */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/papers/new">
                  <PenSquare className="mr-2 h-4 w-4" />
                  Start a new paper
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/papers">
                  <FileText className="mr-2 h-4 w-4" />
                  Browse papers
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/settings">
                  <Star className="mr-2 h-4 w-4" />
                  Complete your profile
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/profiles/${session.user.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View your profile
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest reputation events</CardDescription>
            </CardHeader>
            <CardContent>
              {recentEvents.length > 0 ? (
                <div className="space-y-1">
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <span className="text-xs">
                          {EVENT_LABELS[event.type] ?? event.type}
                        </span>
                        {event.paperTitle && event.sourcePaperId && (
                          <div className="text-xs text-muted-foreground truncate">
                            <Link
                              href={`/papers/${event.sourcePaperId}`}
                              className="text-primary hover:underline"
                            >
                              {event.paperTitle}
                            </Link>
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-green-600 dark:text-green-400">
                        +{event.points}
                      </span>
                    </div>
                  ))}
                  <Link
                    href="/reputation"
                    className="block pt-2 text-center text-xs text-primary hover:underline"
                  >
                    View all activity
                  </Link>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No activity yet. Start by submitting a paper or writing a
                  review.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
