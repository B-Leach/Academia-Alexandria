import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReputationHistory } from "@/actions/reputation";
import { REPUTATION_THRESHOLDS } from "@academia-alexandria/shared";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Reputation",
};

const EVENT_LABELS: Record<string, string> = {
  PAPER_ACCEPTED: "Paper accepted (peer reviewed)",
  REVIEW_SUBMITTED: "Submitted a qualifying review",
  ENDORSEMENT_RECEIVED: "Received an endorsement",
  ENDORSEMENT_GIVEN: "Endorsed a paper",
  BOUNTY_REVIEW_COMPLETED: "Completed a bounty review",
  PAPER_ENDORSED_BY_TRUSTED: "Endorsed by trusted reviewer",
};

const tiers = [
  { name: "New Researcher", min: 0 },
  { name: "Can Endorse", min: REPUTATION_THRESHOLDS.CAN_ENDORSE },
  { name: "Trusted Reviewer", min: REPUTATION_THRESHOLDS.TRUSTED_REVIEWER },
  { name: "Moderator", min: REPUTATION_THRESHOLDS.CAN_MODERATE },
];

function getCurrentTier(score: number) {
  let current = tiers[0];
  for (const tier of tiers) {
    if (score >= tier.min) current = tier;
  }
  return current;
}

function getNextTier(score: number) {
  for (const tier of tiers) {
    if (score < tier.min) return tier;
  }
  return null;
}

export default async function ReputationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const [user, events] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { reputationScore: true, name: true },
    }),
    getReputationHistory(session.user.id),
  ]);

  const score = user?.reputationScore ?? 0;
  const currentTier = getCurrentTier(score);
  const nextTier = getNextTier(score);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reputation</h1>
        <p className="mt-2 text-muted-foreground">
          Your contribution history and standing in the community.
        </p>
      </div>

      {/* Score and Tier */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reputation</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{score.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Current tier: <span className="font-medium text-foreground">{currentTier.name}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Milestone</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextTier ? (
              <>
                <div className="text-3xl font-bold">{nextTier.min.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {(nextTier.min - score).toLocaleString()} points until{" "}
                  <span className="font-medium text-foreground">{nextTier.name}</span>
                </p>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (score / nextTier.min) * 100)}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold">Max</div>
                <p className="text-sm text-muted-foreground mt-1">
                  You have reached the highest tier.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tier Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Milestones</CardTitle>
          <CardDescription>Unlockable privileges as you contribute</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tiers.map((tier) => {
              const reached = score >= tier.min;
              return (
                <div
                  key={tier.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        reached ? "bg-primary" : "bg-muted"
                      }`}
                    />
                    <span className={reached ? "font-medium" : "text-muted-foreground"}>
                      {tier.name}
                    </span>
                  </div>
                  <Badge variant={reached ? "default" : "secondary"}>
                    {tier.min.toLocaleString()} pts
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your last 50 reputation events</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-1">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-md px-3 py-3 text-sm hover:bg-accent/50"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <span className="font-medium">
                      {EVENT_LABELS[event.type] ?? event.type}
                    </span>
                    {event.paperTitle && event.sourcePaperId && (
                      <span className="text-muted-foreground">
                        {" "}for{" "}
                        <Link
                          href={`/papers/${event.sourcePaperId}`}
                          className="text-primary hover:underline"
                        >
                          {event.paperTitle}
                        </Link>
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(event.createdAt)}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-green-600 dark:text-green-400">
                    +{event.points}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No reputation events yet. Start by submitting a paper or writing a review.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
