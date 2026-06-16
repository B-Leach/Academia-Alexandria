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
import { banUser } from "@/actions/admin";
import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";

export function BanUserDialog({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleBan() {
    setIsPending(true);
    const result = await banUser(userId, reason);
    setIsPending(false);

    if ("error" in result) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }

    toast({ title: `${userName} has been banned`, variant: "success" });
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Ban className="mr-1 h-3.5 w-3.5" />
          Ban User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {userName}?</DialogTitle>
          <DialogDescription>
            This user will be unable to log in. Provide a reason for the ban.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason for banning..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBan} disabled={isPending}>
            {isPending ? "Banning..." : "Ban User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
