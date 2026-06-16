"use client";

import { useState, useActionState } from "react";
import { createReview, type ReviewActionResult } from "@/actions/review";
import { toast } from "@/hooks/use-toast";
import {
  REVIEW_RUBRIC,
  REVIEW_RECOMMENDATIONS,
  CONFIDENCE_LEVELS,
} from "@academia-alexandria/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REVIEW_DEFAULTS } from "@academia-alexandria/shared";
import {
  AlertTriangle,
  ChevronUp,
  Clock,
  DollarSign,
  EyeOff,
  Loader2,
  PenSquare,
} from "lucide-react";

const rubricEntries = Object.entries(REVIEW_RUBRIC) as [
  string,
  { label: string; description: string; min: number; max: number },
][];

interface ReviewFormProps {
  paperId: string;
  bountyAmountCents?: number;
}

export function ReviewForm({ paperId, bountyAmountCents }: ReviewFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasCoi, setHasCoi] = useState(false);
  const [summaryLen, setSummaryLen] = useState(0);
  const [strengthsLen, setStrengthsLen] = useState(0);
  const [weaknessesLen, setWeaknessesLen] = useState(0);
  const [state, formAction, isPending] = useActionState<
    ReviewActionResult,
    FormData
  >(async (_prev, formData) => {
    const result = await createReview(formData);
    if (result.success) {
      toast({
        title: "Review submitted",
        description: "Thank you for your peer review.",
        variant: "success",
      });
      setExpanded(false);
    }
    return result;
  }, {});

  if (!expanded) {
    return (
      <Button onClick={() => setExpanded(true)} variant="outline" aria-expanded={false}>
        <PenSquare className="mr-2 h-4 w-4" />
        Write a Review
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-expanded={true}
          className="flex w-full items-center justify-between"
        >
          <CardTitle className="text-lg">Write a Review</CardTitle>
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        </button>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-8">
          <input type="hidden" name="paperId" value={paperId} />

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          {bountyAmountCents && bountyAmountCents > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  This paper has an active review bounty of $
                  {(bountyAmountCents / 100).toFixed(0)}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Your review should be based solely on academic merit. Bounty
                  payments are independent of your recommendation.
                </p>
              </div>
            </div>
          )}

          {/* Rubric Scores */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold">Rubric Scores (1-10)</h3>
            {rubricEntries.map(([key, dim]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`${key}Score`}>{dim.label}</Label>
                <p className="text-xs text-muted-foreground">
                  {dim.description}
                </p>
                <Input
                  id={`${key}Score`}
                  name={`${key}Score`}
                  type="number"
                  min={dim.min}
                  max={dim.max}
                  defaultValue={5}
                  className="w-24"
                />
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div className="space-y-1.5">
            <Label>Recommendation</Label>
            <Select name="recommendation" defaultValue="NEEDS_REVISION">
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_RECOMMENDATIONS.map((rec) => (
                  <SelectItem key={rec.value} value={rec.value}>
                    {rec.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Confidence Level */}
          <div className="space-y-1.5">
            <Label>Confidence Level</Label>
            <Select name="confidenceLevel" defaultValue="3">
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={String(level.value)}>
                    {level.label} — {level.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              name="summary"
              placeholder="Provide an overall summary of your assessment..."
              rows={4}
              onChange={(e) => setSummaryLen(e.target.value.length)}
            />
            <p className={`text-xs ${summaryLen > 0 && summaryLen < 100 ? "text-destructive" : "text-muted-foreground"}`}>
              {summaryLen}/100 characters minimum
            </p>
          </div>

          {/* Strengths */}
          <div className="space-y-1.5">
            <Label htmlFor="strengthsText">Strengths</Label>
            <Textarea
              id="strengthsText"
              name="strengthsText"
              placeholder="What are the main strengths of this paper?"
              rows={4}
              onChange={(e) => setStrengthsLen(e.target.value.length)}
            />
            <p className={`text-xs ${strengthsLen > 0 && strengthsLen < 100 ? "text-destructive" : "text-muted-foreground"}`}>
              {strengthsLen}/100 characters minimum
            </p>
          </div>

          {/* Weaknesses */}
          <div className="space-y-1.5">
            <Label htmlFor="weaknessesText">Weaknesses</Label>
            <Textarea
              id="weaknessesText"
              name="weaknessesText"
              placeholder="What are the main weaknesses or areas for improvement?"
              rows={4}
              onChange={(e) => setWeaknessesLen(e.target.value.length)}
            />
            <p className={`text-xs ${weaknessesLen > 0 && weaknessesLen < 100 ? "text-destructive" : "text-muted-foreground"}`}>
              {weaknessesLen}/100 characters minimum
            </p>
          </div>

          {/* Detailed Comments */}
          <div className="space-y-1.5">
            <Label htmlFor="detailedComments">
              Detailed Comments (optional)
            </Label>
            <Textarea
              id="detailedComments"
              name="detailedComments"
              placeholder="Any additional detailed comments, suggestions, or questions for the authors..."
              rows={4}
            />
          </div>

          {/* Anonymous Review */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAnonymous"
              name="isAnonymous"
              value="true"
              className="h-4 w-4 rounded border-input"
            />
            <Label
              htmlFor="isAnonymous"
              className="flex items-center gap-1.5 text-sm font-normal"
            >
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              Submit this review anonymously
            </Label>
          </div>

          {/* Conflict of Interest */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasCoi"
                checked={hasCoi}
                onChange={(e) => setHasCoi(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label
                htmlFor="hasCoi"
                className="flex items-center gap-1.5 text-sm font-normal"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                I have a potential conflict of interest to declare
              </Label>
            </div>
            {hasCoi && (
              <Textarea
                id="conflictOfInterest"
                name="conflictOfInterest"
                placeholder="Please describe your conflict of interest (e.g., professional relationship, financial interest, institutional affiliation with authors)..."
                rows={3}
                maxLength={2000}
              />
            )}
          </div>

          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day verification period
              </p>
              <p className="text-xs text-muted-foreground">
                After enough qualifying reviews are submitted, a{" "}
                {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day verification
                period begins. You may edit or delete your review during this
                time. Bounty payouts are processed after the verification period
                ends, regardless of your recommendation.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
