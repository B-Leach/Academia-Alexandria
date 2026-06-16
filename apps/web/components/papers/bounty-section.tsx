import { getBounty } from "@/actions/bounty";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateBountyForm } from "@/components/papers/create-bounty-form";
import { REVIEW_DEFAULTS } from "@academia-alexandria/shared";
import { formatDate } from "@/lib/utils";
import { DollarSign, CheckCircle2, Clock, Users } from "lucide-react";

interface BountySectionProps {
  paperId: string;
  isAuthor: boolean;
  paperStatus: string;
}

export async function BountySection({
  paperId,
  isAuthor,
  paperStatus,
}: BountySectionProps) {
  const bounty = await getBounty(paperId);

  // No bounty exists
  if (!bounty) {
    if (!isAuthor || paperStatus !== "SUBMITTED") return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Research Bounty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Incentivize peer reviewers by adding a per-review bounty.
            Each qualifying reviewer earns a fixed amount after the{" "}
            {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day verification period.
          </p>
          <CreateBountyForm paperId={paperId} />
        </CardContent>
      </Card>
    );
  }

  // Active bounty
  if (bounty.status === "ACTIVE") {
    const perReviewerDollars = (bounty.perReviewerCents / 100).toFixed(2);
    const totalDollars = (bounty.totalAmountCents / 100).toFixed(2);

    return (
      <Card className="border-amber-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Research Bounty
            </CardTitle>
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
              ${totalDollars}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>{perReviewerDollars}</strong> per review
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>{bounty.slotsRemaining}</strong> of{" "}
                <strong>{bounty.maxReviews}</strong> slots remaining
              </span>
            </div>
          </div>
          {bounty.slotsRemaining > 0 && (
            <p className="text-sm text-muted-foreground">
              Submit a qualifying review to earn ${perReviewerDollars} USD.
              Payouts are processed after a{" "}
              {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day verification
              period.
            </p>
          )}
          {bounty.expiresAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Expires {formatDate(bounty.expiresAt)}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Completed bounty
  if (bounty.status === "COMPLETED") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Research Bounty
            </CardTitle>
            <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All {bounty.maxReviews} review bounties of $
            {(bounty.perReviewerCents / 100).toFixed(2)} each have been paid out.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Expired bounty
  if (bounty.status === "EXPIRED") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Research Bounty
            </CardTitle>
            <Badge variant="secondary" className="text-muted-foreground">
              Expired
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This bounty has expired.
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
