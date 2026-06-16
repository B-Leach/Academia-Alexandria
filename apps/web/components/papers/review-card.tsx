"use client";

import { useState } from "react";
import { ReviewEditForm } from "@/components/papers/review-edit-form";
import {
  REVIEW_RUBRIC,
  REVIEW_RECOMMENDATIONS,
  CONFIDENCE_LEVELS,
} from "@academia-alexandria/shared";
import { deleteReviewAdmin } from "@/actions/admin";
import { deleteReview } from "@/actions/review";
import { toast } from "@/hooks/use-toast";
import { ReportButton } from "@/components/report-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { displayName, formatRelativeTime, getInitials } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Edit2,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";

const recommendationColors: Record<string, string> = {
  SOUND: "bg-green-500/10 text-green-700 dark:text-green-400",
  NEEDS_REVISION: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  UNSOUND: "bg-red-500/10 text-red-700 dark:text-red-400",
};

interface ReviewCardProps {
  isAdmin?: boolean;
  paperStatus?: string;
  review: {
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
  currentUserId?: string;
}

export function ReviewCard({
  review,
  currentUserId,
  isAdmin,
  paperStatus,
}: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const canEdit =
    currentUserId === review.reviewer.id &&
    paperStatus !== "PUBLISHED" &&
    paperStatus !== "RETRACTED";

  const canDelete =
    currentUserId === review.reviewer.id && paperStatus === "SUBMITTED";

  const initials = getInitials(review.reviewer.name);

  const recommendation = REVIEW_RECOMMENDATIONS.find(
    (r) => r.value === review.recommendation,
  );

  const confidence = CONFIDENCE_LEVELS.find(
    (c) => c.value === review.confidenceLevel,
  );

  const scores: { key: keyof typeof REVIEW_RUBRIC; value: number }[] = [
    { key: "methodology", value: review.methodologyScore },
    { key: "novelty", value: review.noveltyScore },
    { key: "clarity", value: review.clarityScore },
    { key: "reproducibility", value: review.reproducibilityScore },
    { key: "ethics", value: review.ethicsScore },
  ];

  const avgScore = scores.reduce((sum, s) => sum + s.value, 0) / scores.length;

  if (editing) {
    return (
      <ReviewEditForm
        reviewId={review.id}
        initialValues={{
          methodologyScore: review.methodologyScore,
          noveltyScore: review.noveltyScore,
          clarityScore: review.clarityScore,
          reproducibilityScore: review.reproducibilityScore,
          ethicsScore: review.ethicsScore,
          summary: review.summary,
          strengthsText: review.strengthsText,
          weaknessesText: review.weaknessesText,
          detailedComments: review.detailedComments,
          recommendation: review.recommendation,
          confidenceLevel: review.confidenceLevel,
          conflictOfInterest: review.conflictOfInterest,
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={review.reviewer.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Link
                href={`/profiles/${review.reviewer.id}`}
                className="text-sm font-medium hover:underline"
              >
                {displayName(review.reviewer.name, review.reviewer.honorific)}
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3" />
                  {review.reviewer.reputationScore}
                </span>
                <span>{formatRelativeTime(review.createdAt)}</span>
                {review.editedAt && (
                  <span className="italic text-muted-foreground">(edited)</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {canDelete && (
              <DeleteReviewDialog
                reviewId={review.id}
                onDelete={deleteReview}
                title="Delete your review?"
                description="This cannot be undone. Any reputation earned for this review will be reversed."
                label="Delete"
              />
            )}
            {currentUserId === review.reviewer.id && !canEdit && !canDelete && (
              <span className="text-xs text-muted-foreground">
                Reviews are locked after publication
              </span>
            )}
            {currentUserId && currentUserId !== review.reviewer.id && (
              <ReportButton
                targetType="REVIEW"
                targetId={review.id}
                size="icon"
              />
            )}
            {review.isQualifying && (
              <Badge
                variant="outline"
                className="gap-1 text-green-700 border-green-300 dark:text-green-400 dark:border-green-700"
              >
                <CheckCircle2 className="h-3 w-3" />
                Qualifying
              </Badge>
            )}
            {recommendation && (
              <Badge
                variant="secondary"
                className={recommendationColors[review.recommendation]}
              >
                {recommendation.label}
              </Badge>
            )}
          </div>
        </div>

        {/* COI Declaration */}
        {review.conflictOfInterest && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div>
              <span className="font-medium text-yellow-700 dark:text-yellow-400">
                COI Declaration:{" "}
              </span>
              <span className="text-yellow-700 dark:text-yellow-300">
                {review.conflictOfInterest}
              </span>
            </div>
          </div>
        )}

        {/* Rubric Scores */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {scores.map((s) => (
            <div key={s.key} className="text-center">
              <div className="text-lg font-semibold">{s.value}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                {REVIEW_RUBRIC[s.key].label}
              </div>
            </div>
          ))}
        </div>

        {/* Confidence + Average */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Average:{" "}
            <span className="font-medium text-foreground">
              {avgScore.toFixed(1)}
            </span>
            /10
          </span>
          {confidence && (
            <span>
              Confidence:{" "}
              <span className="font-medium text-foreground">
                {confidence.label}
              </span>
            </span>
          )}
        </div>

        {/* Summary */}
        <div>
          <h4 className="text-sm font-medium mb-1">Summary</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {review.summary}
          </p>
        </div>

        {/* Expandable sections */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show strengths, weaknesses & details
            </>
          )}
        </button>

        {expanded && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Strengths</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {review.strengthsText}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Weaknesses</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {review.weaknessesText}
              </p>
            </div>
            {review.detailedComments && (
              <div>
                <h4 className="text-sm font-medium mb-1">Detailed Comments</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {review.detailedComments}
                </p>
              </div>
            )}
            {isAdmin && paperStatus !== "PUBLISHED" && (
              <DeleteReviewDialog
                reviewId={review.id}
                onDelete={deleteReviewAdmin}
                title="Delete this review?"
                description="This cannot be undone and may affect the paper's acceptance status."
                label="Delete Review"
                variant="destructive"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeleteReviewDialog({
  reviewId,
  onDelete,
  title,
  description,
  label,
  variant = "ghost",
}: {
  reviewId: string;
  onDelete: (id: string) => Promise<{ error?: string } | { success: boolean }>;
  title: string;
  description: string;
  label: string;
  variant?: "ghost" | "destructive";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    setIsPending(true);
    const result = await onDelete(reviewId);
    setIsPending(false);
    if ("error" in result && result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Review deleted", variant: "success" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={variant === "ghost" ? "text-destructive hover:text-destructive" : ""}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
