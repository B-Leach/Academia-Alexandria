"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { retractPaper } from "@/actions/admin";
import { useRouter } from "next/navigation";

export function RetractPaperDialog({ paperId, paperTitle }: { paperId: string; paperTitle: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleRetract() {
    setIsPending(true);
    const result = await retractPaper(paperId, reason);
    setIsPending(false);

    if ("error" in result) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Paper has been retracted", variant: "success" });
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Retract
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retract paper?</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              This will retract &quot;{paperTitle}&quot;. The paper will remain visible but marked as retracted.
            </span>
            <span className="block">This action cannot be easily undone.</span>
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason for retraction..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRetract} disabled={isPending}>
            {isPending ? "Retracting..." : "Retract Paper"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
