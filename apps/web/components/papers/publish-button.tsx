"use client";

import { useState, useActionState } from "react";
import {
  submitPaper,
  deletePaper,
  type PaperActionResult,
} from "@/actions/paper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EyeOff, Loader2, Send, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export function SubmitButton({ paperId }: { paperId: string }) {
  const [open, setOpen] = useState(false);
  const [blindReview, setBlindReview] = useState(false);
  const [state, formAction, isPending] = useActionState<
    PaperActionResult,
    FormData
  >(async () => {
    return submitPaper(paperId, { isBlindSubmission: blindReview });
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Send className="mr-2 h-4 w-4" />
          Submit Paper
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit this paper?</DialogTitle>
          <DialogDescription>
            Your paper will become publicly visible and open for peer review.
            Once it receives qualifying reviews, it may be accepted for
            publication.
          </DialogDescription>
        </DialogHeader>
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="blindReview"
            checked={blindReview}
            onChange={(e) => setBlindReview(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <Label
            htmlFor="blindReview"
            className="flex items-center gap-1.5 text-sm font-normal"
          >
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            Request blind review (hide author names during review)
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={formAction}>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Review
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDraftButton({ paperId }: { paperId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<
    PaperActionResult,
    FormData
  >(async () => {
    return deletePaper(paperId);
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Draft
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this draft?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. The paper and all associated data will
            be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={formAction}>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
