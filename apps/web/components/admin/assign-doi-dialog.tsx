"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignDoi, setManualDoi } from "@/actions/admin";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

interface AssignDoiDialogProps {
  paperId: string;
  paperTitle: string;
  crossrefEnabled: boolean;
}

export function AssignDoiDialog({
  paperId,
  paperTitle,
  crossrefEnabled,
}: AssignDoiDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (crossrefEnabled) {
    return (
      <CrossRefAssign
        paperId={paperId}
        paperTitle={paperTitle}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <ManualAssign
      paperId={paperId}
      paperTitle={paperTitle}
      open={open}
      onOpenChange={setOpen}
      onSuccess={() => {
        setOpen(false);
        router.refresh();
      }}
    />
  );
}

function CrossRefAssign({
  paperId,
  paperTitle,
  open,
  onOpenChange,
  onSuccess,
}: {
  paperId: string;
  paperTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [state, action, isPending] = useActionState(
    async () => {
      const result = await assignDoi(paperId);
      if ("error" in result) {
        toast({ title: result.error, variant: "destructive" });
        return result;
      }
      toast({ title: `DOI assigned: ${result.doi}`, variant: "success" });
      onSuccess();
      return result;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Assign DOI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign DOI via CrossRef</DialogTitle>
          <DialogDescription className="line-clamp-2">
            Register a DOI for &ldquo;{paperTitle}&rdquo; through CrossRef.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state && "error" in state && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register DOI
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManualAssign({
  paperId,
  paperTitle,
  open,
  onOpenChange,
  onSuccess,
}: {
  paperId: string;
  paperTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [state, action, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const doi = formData.get("doi") as string;
      if (!doi?.trim()) return { error: "DOI is required" };

      const result = await setManualDoi(paperId, doi);
      if ("error" in result) {
        toast({ title: result.error, variant: "destructive" });
        return result;
      }
      toast({ title: `DOI set: ${result.doi}`, variant: "success" });
      onSuccess();
      return result;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Set DOI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set DOI Manually</DialogTitle>
          <DialogDescription className="line-clamp-2">
            Enter an existing DOI for &ldquo;{paperTitle}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state && "error" in state && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="doi">DOI</Label>
            <Input
              id="doi"
              name="doi"
              placeholder="10.1234/example.123"
              required
            />
            <p className="text-xs text-muted-foreground">
              Format: 10.XXXX/suffix
            </p>
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save DOI
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
