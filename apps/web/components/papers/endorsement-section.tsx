"use client";

import { useState, useActionState } from "react";
import {
  createEndorsement,
  type EndorsementActionResult,
} from "@/actions/endorsement";
import { toast } from "@/hooks/use-toast";
import { REPUTATION_THRESHOLDS } from "@academia-alexandria/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { displayName, formatRelativeTime, getInitials } from "@/lib/utils";
import { AlertTriangle, Loader2, Star, ThumbsUp } from "lucide-react";
import Link from "next/link";

type Endorsement = {
  id: string;
  statement: string | null;
  conflictOfInterest: string | null;
  createdAt: Date;
  endorser: {
    id: string;
    name: string;
    honorific: string | null;
    avatarUrl: string | null;
    reputationScore: number;
    institution: string | null;
  };
};

interface EndorsementSectionProps {
  paperId: string;
  endorsements: Endorsement[];
  currentUserId?: string;
  isAuthor: boolean;
  hasEndorsed: boolean;
  userReputation: number;
}

export function EndorsementSection({
  paperId,
  endorsements,
  currentUserId,
  isAuthor,
  hasEndorsed,
  userReputation,
}: EndorsementSectionProps) {
  const canEndorse =
    currentUserId &&
    !isAuthor &&
    !hasEndorsed &&
    userReputation >= REPUTATION_THRESHOLDS.CAN_ENDORSE;

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <ThumbsUp className="h-5 w-5" />
        Endorsements ({endorsements.length})
      </h2>

      {/* Endorsement form or gating message */}
      {!currentUserId && (
        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to endorse this paper.
        </p>
      )}

      {currentUserId && isAuthor && (
        <p className="text-sm text-muted-foreground">
          Authors cannot endorse their own paper.
        </p>
      )}

      {currentUserId && !isAuthor && hasEndorsed && (
        <p className="text-sm text-muted-foreground">
          You have already endorsed this paper.
        </p>
      )}

      {currentUserId &&
        !isAuthor &&
        !hasEndorsed &&
        userReputation < REPUTATION_THRESHOLDS.CAN_ENDORSE && (
          <p className="text-sm text-muted-foreground">
            You need at least {REPUTATION_THRESHOLDS.CAN_ENDORSE} reputation to
            endorse papers. You currently have {userReputation}.
          </p>
        )}

      {canEndorse && <EndorseForm paperId={paperId} />}

      {/* Endorsement list */}
      {endorsements.length > 0 ? (
        <div className="space-y-3">
          {endorsements.map((endorsement) => (
            <EndorsementItem key={endorsement.id} endorsement={endorsement} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ThumbsUp className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            No endorsements yet
          </p>
          <p className="text-xs text-muted-foreground/70">
            Endorsements from established researchers add credibility to this
            paper.
          </p>
        </div>
      )}
    </div>
  );
}

function EndorseForm({ paperId }: { paperId: string }) {
  const [hasCoi, setHasCoi] = useState(false);
  const [state, formAction, isPending] = useActionState<
    EndorsementActionResult,
    FormData
  >(async (_prev, formData) => {
    const result = await createEndorsement(formData);
    if (result.success) {
      toast({
        title: "Paper endorsed",
        description: "Your endorsement has been recorded.",
        variant: "success",
      });
    }
    return result;
  }, {});

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="paperId" value={paperId} />

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="statement">Endorsement statement (optional)</Label>
            <Textarea
              id="statement"
              name="statement"
              placeholder="Why do you endorse this paper? What makes it valuable to the community?"
              rows={3}
            />
          </div>

          {/* Conflict of Interest */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="endorseHasCoi"
                checked={hasCoi}
                onChange={(e) => setHasCoi(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label
                htmlFor="endorseHasCoi"
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
                placeholder="Please describe your conflict of interest..."
                rows={3}
                maxLength={2000}
              />
            )}
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <ThumbsUp className="mr-2 h-4 w-4" />
            Endorse This Paper
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EndorsementItem({ endorsement }: { endorsement: Endorsement }) {
  const initials = getInitials(endorsement.endorser.name);

  return (
    <div className="flex gap-3 rounded-lg border p-4">
      <Avatar className="h-9 w-9">
        <AvatarImage
          src={endorsement.endorser.avatarUrl ?? undefined}
          alt={endorsement.endorser.name ?? "User avatar"}
        />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/profiles/${endorsement.endorser.id}`}
            className="text-sm font-medium hover:underline"
          >
            {displayName(
              endorsement.endorser.name,
              endorsement.endorser.honorific,
            )}
          </Link>
          <Badge variant="secondary" className="gap-0.5 text-[10px]">
            <Star className="h-2.5 w-2.5" />
            {endorsement.endorser.reputationScore}
          </Badge>
          {endorsement.endorser.institution && (
            <span className="text-xs text-muted-foreground">
              {endorsement.endorser.institution}
            </span>
          )}
        </div>
        {endorsement.statement && (
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {endorsement.statement}
          </p>
        )}
        {endorsement.conflictOfInterest && (
          <div className="flex items-start gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>COI: {endorsement.conflictOfInterest}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(endorsement.createdAt)}
        </p>
      </div>
    </div>
  );
}
