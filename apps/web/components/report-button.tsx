"use client";

import { useState, useRef } from "react";
import { createReport, type ReportActionResult } from "@/actions/report";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Flag, Loader2 } from "lucide-react";

interface ReportButtonProps {
  targetType: "COMMENT" | "REVIEW" | "PAPER";
  targetId: string;
  size?: "sm" | "icon";
}

export function ReportButton({ targetType, targetId, size = "sm" }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);

    formData.set("targetType", targetType);
    formData.set("targetId", targetId);

    const result: ReportActionResult = await createReport(formData);
    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast({
      title: "Report submitted",
      description: "Thank you. A moderator will review your report.",
      variant: "success",
    });
    setOpen(false);
  }

  const label = targetType === "COMMENT"
    ? "comment"
    : targetType === "REVIEW"
      ? "review"
      : "paper";

  if (size === "icon") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
            aria-label={`Report this ${label}`}
          >
            <Flag className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <ReportDialogContent
          label={label}
          error={error}
          isPending={isPending}
          formRef={formRef}
          onSubmit={handleSubmit}
        />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <Flag className="mr-1 h-3.5 w-3.5" />
          Report
        </Button>
      </DialogTrigger>
      <ReportDialogContent
        label={label}
        error={error}
        isPending={isPending}
        formRef={formRef}
        onSubmit={handleSubmit}
      />
    </Dialog>
  );
}

function ReportDialogContent({
  label,
  error,
  isPending,
  formRef,
  onSubmit,
}: {
  label: string;
  error: string | null;
  isPending: boolean;
  formRef: React.RefObject<HTMLFormElement | null>;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Report {label}</DialogTitle>
        <DialogDescription>
          Describe why this {label} should be reviewed by a moderator.
        </DialogDescription>
      </DialogHeader>
      <form ref={formRef} action={onSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="reportReason">Reason</Label>
          <Textarea
            id="reportReason"
            name="reason"
            placeholder="Explain the issue (10-2000 characters)..."
            rows={4}
            required
            minLength={10}
            maxLength={2000}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
