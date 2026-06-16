import { ReviewForm } from "@/components/papers/review-form";
import { ReviewCard } from "@/components/papers/review-card";
import { Card, CardContent } from "@/components/ui/card";
import { REVIEW_DEFAULTS, REVIEW_RUBRIC } from "@academia-alexandria/shared";
import { BarChart3, Info, Star } from "lucide-react";
import Link from "next/link";

type Review = {
  id: string;
  methodologyScore: number;
  noveltyScore: number;
  clarityScore: number;
  reproducibilityScore: number;
  ethicsScore: number;
  summary: string;
  strengthsText: string;
  weaknessesText: string;
  detailedComments: string;
  recommendation: string;
  confidenceLevel: number;
  conflictOfInterest: string | null;
  isQualifying: boolean;
  createdAt: Date;
  editedAt: Date | null;
  reviewer: {
    id: string;
    name: string;
    honorific: string | null;
    avatarUrl: string | null;
    reputationScore: number;
  };
};

interface ReviewSectionProps {
  paperId: string;
  reviews: Review[];
  currentUserId?: string;
  isAuthor: boolean;
  hasReviewed: boolean;
  paperStatus: string;
  isAdmin?: boolean;
  bountyAmountCents?: number;
}

export function ReviewSection({
  paperId,
  reviews,
  currentUserId,
  isAuthor,
  hasReviewed,
  paperStatus,
  isAdmin,
  bountyAmountCents,
}: ReviewSectionProps) {
  const totalReviews = reviews.length;
  const qualifyingReviews = reviews.filter((r) => r.isQualifying);
  const qualifyingSoundReviews = qualifyingReviews.filter(
    (r) => r.recommendation === "SOUND",
  );

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Star className="h-5 w-5" />
        Peer Reviews ({totalReviews})
      </h2>

      {/* Publication progress for SUBMITTED papers */}
      {paperStatus === "SUBMITTED" && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {qualifyingSoundReviews.length} of {qualifyingReviews.length}{" "}
              qualifying review{qualifyingReviews.length !== 1 ? "s" : ""} rated
              &ldquo;Sound&rdquo; (minimum 3 needed, all must be Sound)
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              A review qualifies if the reviewer&apos;s research areas overlap
              with the paper&apos;s disciplines. All qualifying reviews must
              rate the paper as &ldquo;Sound&rdquo; for acceptance. Once
              criteria are met, a {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day verification period begins before the
              outcome is finalized.
            </p>
          </div>
        </div>
      )}

      {/* Review consensus summary for papers with reviews */}
      {totalReviews > 0 && (paperStatus === "PUBLISHED" || paperStatus === "RETRACTED") && (
        <ReviewConsensusSummary reviews={reviews} />
      )}

      {/* Form or message */}
      {!currentUserId && (
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to write a review.
        </p>
      )}

      {currentUserId && isAuthor && (
        <p className="text-sm text-muted-foreground">
          Authors cannot review their own paper.
        </p>
      )}

      {currentUserId && !isAuthor && hasReviewed && (
        <p className="text-sm text-muted-foreground">
          You have already submitted a review for this paper.
        </p>
      )}

      {currentUserId && !isAuthor && !hasReviewed && (
        <ReviewForm paperId={paperId} bountyAmountCents={bountyAmountCents} />
      )}

      {/* Review list */}
      {totalReviews > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              paperStatus={paperStatus}
            />
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No reviews yet. Be the first to review this paper.
        </p>
      )}
    </div>
  );
}

const recommendationColors: Record<string, string> = {
  SOUND: "text-green-700 dark:text-green-400",
  NEEDS_REVISION: "text-yellow-700 dark:text-yellow-400",
  UNSOUND: "text-red-700 dark:text-red-400",
};

function ReviewConsensusSummary({ reviews }: { reviews: Review[] }) {
  const qualifyingReviews = reviews.filter((r) => r.isQualifying);
  const soundCount = qualifyingReviews.filter((r) => r.recommendation === "SOUND").length;
  const revisionCount = qualifyingReviews.filter((r) => r.recommendation === "NEEDS_REVISION").length;
  const unsoundCount = qualifyingReviews.filter((r) => r.recommendation === "UNSOUND").length;

  const dimensions = ["methodology", "novelty", "clarity", "reproducibility", "ethics"] as const;
  const avgScores = dimensions.map((dim) => {
    const key = `${dim}Score` as keyof Review;
    const sum = reviews.reduce((acc, r) => acc + (r[key] as number), 0);
    return { dimension: dim, avg: sum / reviews.length };
  });
  const overallAvg = avgScores.reduce((acc, s) => acc + s.avg, 0) / avgScores.length;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Review Consensus
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {soundCount > 0 && (
            <span className={recommendationColors.SOUND}>
              {soundCount} Sound
            </span>
          )}
          {revisionCount > 0 && (
            <span className={recommendationColors.NEEDS_REVISION}>
              {revisionCount} Needs Revision
            </span>
          )}
          {unsoundCount > 0 && (
            <span className={recommendationColors.UNSOUND}>
              {unsoundCount} Unsound
            </span>
          )}
          {reviews.length > qualifyingReviews.length && (
            <span className="text-muted-foreground">
              {reviews.length - qualifyingReviews.length} non-qualifying
            </span>
          )}
        </div>

        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {avgScores.map((s) => (
            <div key={s.dimension} className="text-center">
              <div className="text-lg font-semibold">{s.avg.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                {REVIEW_RUBRIC[s.dimension].label}
              </div>
            </div>
          ))}
          <div className="text-center">
            <div className="text-lg font-semibold">{overallAvg.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Overall</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
