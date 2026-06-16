import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile, getProfileMetrics } from "@/actions/profile";
import { getReputationBreakdown, getReviewerStats } from "@/actions/reputation";
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PaperCard } from "@/components/papers/paper-card";
import {
  Building,
  Calendar,
  Eye,
  FileText,
  MessageSquare,
  Settings,
  Star,
  ThumbsUp,
} from "lucide-react";
import { displayName, formatDate } from "@/lib/utils";

const REPUTATION_LABELS: Record<string, string> = {
  PAPER_ACCEPTED_LOW: "Paper accepted",
  PAPER_ACCEPTED_MID: "Paper accepted (experienced reviewers)",
  PAPER_ACCEPTED_HIGH: "Paper accepted (expert reviewers)",
  REVIEW_SUBMITTED: "Qualifying review submitted",
  ENDORSEMENT_RECEIVED: "Endorsement received",
  ENDORSEMENT_GIVEN: "Endorsement given",
  BOUNTY_REVIEW_COMPLETED: "Bounty review completed",
  PAPER_ENDORSED_BY_TRUSTED: "Endorsed by trusted reviewer",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const user = await getProfile(userId);
  if (!user) return { title: "Profile" };

  const fullName = displayName(user.name, user.honorific);

  return {
    title: fullName,
    description:
      user.bio?.slice(0, 160) ||
      `${fullName}'s academic profile on Academia Alexandria`,
    openGraph: {
      title: fullName ?? "Researcher",
      description: user.bio?.slice(0, 200) || `${fullName}'s academic profile`,
      type: "profile",
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getProfile(userId);

  if (!user) {
    notFound();
  }

  const [session, reviewerStats, metrics, reputationBreakdown] = await Promise.all([
    auth(),
    getReviewerStats(userId),
    getProfileMetrics(userId),
    getReputationBreakdown(userId),
  ]);
  const isOwnProfile = session?.user?.id === user.id;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const researchAreas = user.researchAreas.map((ra) => ra.researchArea);
  const papers = user.authoredPapers.map((ap) => ap.paper);

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 text-2xl">
              <AvatarImage
                src={user.avatarUrl ?? undefined}
                alt={displayName(user.name, user.honorific)}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    {displayName(user.name, user.honorific)}
                  </h1>
                  {user.institution && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building className="h-3.5 w-3.5" />
                      {user.institution}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" />
                    {user.reputationScore} reputation
                  </Badge>
                  {isOwnProfile && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/settings">
                        <Settings className="mr-1 h-3.5 w-3.5" />
                        Edit Profile
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {user.bio && (
                <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
                  {user.bio}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {formatDate(user.createdAt)}
                </span>
                {user.orcidId && (
                  <a
                    href={`https://orcid.org/${user.orcidId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[#a6ce39] hover:underline"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 256 256"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M256 128C256 198.7 198.7 256 128 256C57.3 256 0 198.7 0 128C0 57.3 57.3 0 128 0C198.7 0 256 57.3 256 128Z"
                        fill="#A6CE39"
                      />
                      <path
                        d="M86.3 186.2H70.9V79.1H86.3V186.2ZM108.9 79.1H150.5C190.2 79.1 207.6 107.4 207.6 132.9C207.6 164.4 184.4 186.2 151.4 186.2H108.9V79.1ZM124.3 172.4H148.8C178 172.4 191.6 153.2 191.6 132.8C191.6 108.5 174.9 92.9 150.1 92.9H124.3V172.4ZM78.6 64.1C84 64.1 88.4 59.7 88.4 54.3C88.4 48.9 84 44.5 78.6 44.5C73.2 44.5 68.8 48.9 68.8 54.3C68.8 59.7 73.2 64.1 78.6 64.1Z"
                        fill="white"
                      />
                    </svg>
                    {user.orcidId}
                  </a>
                )}
              </div>

              {researchAreas.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {researchAreas.map((area) => (
                    <Badge key={area.id} variant="outline" className="text-xs">
                      {area.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Metrics */}
      {(metrics.publishedCount > 0 ||
        metrics.totalViews > 0 ||
        metrics.endorsementsReceived > 0) && (
        <>
          <Separator />
          <div>
            <h2 className="mb-4 text-xl font-semibold">Impact</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics.publishedCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Published papers
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics.totalViews}
                    </div>
                    <p className="text-xs text-muted-foreground">Total views</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <ThumbsUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics.endorsementsReceived}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Endorsements received
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Review Contributions — only shown if user has any */}
      {(reviewerStats.reviewCount > 0 ||
        reviewerStats.endorsementsGiven > 0) && (
        <>
          <Separator />
          <div>
            <h2 className="mb-4 text-xl font-semibold">Review Activity</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {reviewerStats.reviewCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reviews written
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Star className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {reviewerStats.endorsementsGiven}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Endorsements given
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 space-y-1.5">
                  <p className="text-xs text-muted-foreground">Recommendations</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600 dark:text-green-400">{reviewerStats.soundCount} Sound</span>
                    <span className="text-amber-600 dark:text-amber-400">{reviewerStats.needsRevisionCount} Revise</span>
                    <span className="text-red-600 dark:text-red-400">{reviewerStats.unsoundCount} Unsound</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 space-y-1.5">
                  <p className="text-xs text-muted-foreground">Disciplines reviewed</p>
                  <div className="flex flex-wrap gap-1">
                    {reviewerStats.disciplinesReviewed.length > 0 ? (
                      reviewerStats.disciplinesReviewed.slice(0, 5).map((d) => (
                        <Badge key={d} variant="outline" className="text-[10px]">
                          {d.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {reviewerStats.disciplinesReviewed.length > 5 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{reviewerStats.disciplinesReviewed.length - 5} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Reputation Breakdown */}
      {reputationBreakdown.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="mb-4 text-xl font-semibold">Reputation Breakdown</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {reputationBreakdown
                .sort((a, b) => b.points - a.points)
                .map((entry) => (
                  <div
                    key={entry.type}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.type.startsWith("PAPER") ? (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : entry.type.startsWith("REVIEW") || entry.type.startsWith("BOUNTY") ? (
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {REPUTATION_LABELS[entry.type] ?? entry.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.count} {entry.count === 1 ? "time" : "times"}
                        </p>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 text-sm font-semibold text-green-700 dark:text-green-400">
                      +{entry.points}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Papers */}
      <div>
        <h2 className="mb-6 text-xl font-semibold">Papers ({papers.length})</h2>
        {papers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {papers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={{
                  ...paper,
                  keywords: [],
                  authors: [],
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                No papers yet
              </p>
              {isOwnProfile && (
                <p className="text-xs text-muted-foreground/70">
                  <Link
                    href="/papers/new"
                    className="text-primary hover:underline"
                  >
                    Submit your first paper
                  </Link>{" "}
                  to get started.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
