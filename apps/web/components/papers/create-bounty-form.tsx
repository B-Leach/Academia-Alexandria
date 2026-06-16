"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BOUNTY_DEFAULTS,
  REVIEW_DEFAULTS,
  calculateBountyFromPerReview,
} from "@academia-alexandria/shared";
import { DollarSign, Loader2 } from "lucide-react";

interface CreateBountyFormProps {
  paperId: string;
}

export function CreateBountyForm({ paperId }: CreateBountyFormProps) {
  const [open, setOpen] = useState(false);
  const [perReview, setPerReview] = useState(
    BOUNTY_DEFAULTS.SUGGESTED_MIN_PER_REVIEW_CENTS / 100,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxReviews = BOUNTY_DEFAULTS.MAX_REVIEWS;
  const perReviewCents = Math.round(perReview * 100);
  const split = calculateBountyFromPerReview(perReviewCents, maxReviews);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          perReviewCents,
          maxReviews,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create checkout session");
        return;
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <DollarSign className="mr-2 h-4 w-4" />
          Add a Bounty
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fund a Peer Review Bounty</DialogTitle>
          <DialogDescription>
            Set a per-review bounty to incentivize reviewers. Each qualifying
            reviewer earns this amount after the {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day
            verification period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="bounty-per-review">Amount Per Review (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="bounty-per-review"
                type="number"
                min={BOUNTY_DEFAULTS.MIN_PER_REVIEW_CENTS / 100}
                max={BOUNTY_DEFAULTS.MAX_PER_REVIEW_CENTS / 100}
                step={5}
                value={perReview}
                onChange={(e) => setPerReview(Number(e.target.value))}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Suggested: ${BOUNTY_DEFAULTS.SUGGESTED_MIN_PER_REVIEW_CENTS / 100} &ndash; $
              {BOUNTY_DEFAULTS.SUGGESTED_MAX_PER_REVIEW_CENTS / 100} per review.
            </p>
          </div>

          <div className="rounded-md border bg-muted/50 p-4 text-sm">
            <p className="mb-2 font-medium">Cost Breakdown</p>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>
                  ${(perReviewCents / 100).toFixed(2)} &times; {maxReviews} reviews
                </span>
                <span className="font-medium text-foreground">
                  ${(split.reviewerPoolCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Platform fee (10%)</span>
                <span>${(split.platformFeeCents / 100).toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t pt-1 font-medium text-foreground">
                <span>Total</span>
                <span>${(split.totalAmountCents / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Reviewers are paid after a {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day
            verification period, regardless of whether the paper is accepted or
            rejected. You are paying for expert evaluation, not a specific outcome.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              perReviewCents < BOUNTY_DEFAULTS.MIN_PER_REVIEW_CENTS ||
              perReviewCents > BOUNTY_DEFAULTS.MAX_PER_REVIEW_CENTS
            }
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <DollarSign className="mr-2 h-4 w-4" />
            )}
            Fund Bounty &mdash; ${(split.totalAmountCents / 100).toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
