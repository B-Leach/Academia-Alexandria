"use client";

import { useState } from "react";
import { respondToInvitation } from "@/actions/invitation";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";

interface InvitationCardProps {
  invitation: {
    id: string;
    paper: { id: string; title: string };
    inviter: { name: string };
  };
}

export function InvitationCard({ invitation }: InvitationCardProps) {
  const [pending, setPending] = useState(false);
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);

  async function handleRespond(accept: boolean) {
    setPending(true);
    const result = await respondToInvitation(invitation.id, accept);
    if (result.success) {
      setResponded(accept ? "accepted" : "declined");
    }
    setPending(false);
  }

  if (responded) {
    return (
      <div className="flex items-center justify-between rounded-md px-3 py-3 text-sm bg-muted/50">
        <span className="text-muted-foreground">
          You {responded} the invitation for{" "}
          <span className="font-medium text-foreground">{invitation.paper.title}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-3 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <span className="font-medium">{invitation.inviter.name}</span>{" "}
        <span className="text-muted-foreground">invited you as co-author on</span>{" "}
        <span className="font-medium">{invitation.paper.title}</span>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => handleRespond(true)}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1 h-3.5 w-3.5" />
          )}
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => handleRespond(false)}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Decline
        </Button>
      </div>
    </div>
  );
}
