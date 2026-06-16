"use client";

import { useState, useActionState } from "react";
import { editReview, type ReviewActionResult } from "@/actions/review";
import { toast } from "@/hooks/use-toast";
import { REVIEW_RUBRIC, REVIEW_RECOMMENDATIONS, CONFIDENCE_LEVELS } from "@academia-alexandria/shared";
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
import { AlertTriangle, Loader2 } from "lucide-react";

const rubricEntries = Object.entries(REVIEW_RUBRIC) as [
  string,
  { label: string; description: string; min: number; max: number },
][];

interface ReviewEditFormProps {
  reviewId: string;
  initialValues: {
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
  };
  onCancel: () => void;
}

export function ReviewEditForm({ reviewId, initialValues, onCancel }: ReviewEditFormProps) {
  const [hasCoi, setHasCoi] = useState(!!initialValues.conflictOfInterest);
  const [state, formAction, isPending] = useActionState<ReviewActionResult, FormData>(
    async (_prev, formData) => {
      const result = await editReview(reviewId, formData);
      if (result.success) {
        toast({
          title: "Review updated",
          description: "Your review has been saved.",
          variant: "success",
        });
        onCancel();
      }
      return result;
    },
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-8">
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          {/* Rubric Scores */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold">Rubric Scores (1-10)</h3>
            {rubricEntries.map(([key, dim]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`edit-${key}Score`}>{dim.label}</Label>
                <p className="text-xs text-muted-foreground">{dim.description}</p>
                <Input
                  id={`edit-${key}Score`}
                  name={`${key}Score`}
                  type="number"
                  min={dim.min}
                  max={dim.max}
                  defaultValue={initialValues[`${key}Score` as keyof typeof initialValues] as number}
                  className="w-24"
                />
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div className="space-y-1.5">
            <Label>Recommendation</Label>
            <Select name="recommendation" defaultValue={initialValues.recommendation}>
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
            <Select name="confidenceLevel" defaultValue={String(initialValues.confidenceLevel)}>
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
            <Label htmlFor="edit-summary">Summary</Label>
            <Textarea
              id="edit-summary"
              name="summary"
              defaultValue={initialValues.summary}
              rows={4}
            />
          </div>

          {/* Strengths */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-strengthsText">Strengths</Label>
            <Textarea
              id="edit-strengthsText"
              name="strengthsText"
              defaultValue={initialValues.strengthsText}
              rows={4}
            />
          </div>

          {/* Weaknesses */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-weaknessesText">Weaknesses</Label>
            <Textarea
              id="edit-weaknessesText"
              name="weaknessesText"
              defaultValue={initialValues.weaknessesText}
              rows={4}
            />
          </div>

          {/* Detailed Comments */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-detailedComments">Detailed Comments (optional)</Label>
            <Textarea
              id="edit-detailedComments"
              name="detailedComments"
              defaultValue={initialValues.detailedComments}
              rows={4}
            />
          </div>

          {/* Conflict of Interest */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-hasCoi"
                checked={hasCoi}
                onChange={(e) => setHasCoi(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="edit-hasCoi" className="flex items-center gap-1.5 text-sm font-normal">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                I have a potential conflict of interest to declare
              </Label>
            </div>
            {hasCoi && (
              <Textarea
                id="edit-conflictOfInterest"
                name="conflictOfInterest"
                defaultValue={initialValues.conflictOfInterest ?? ""}
                rows={3}
                maxLength={2000}
              />
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
