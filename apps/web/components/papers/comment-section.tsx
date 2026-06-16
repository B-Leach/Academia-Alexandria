"use client";

import { useActionState, useRef, useState } from "react";
import { createComment, type CommentActionResult } from "@/actions/comment";
import { deleteCommentAdmin } from "@/actions/admin";
import { toast } from "@/hooks/use-toast";
import { ReportButton } from "@/components/report-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { displayName, formatRelativeTime, getInitials } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, MessageSquare, Reply, Trash2 } from "lucide-react";
import Link from "next/link";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  paperVersion: number;
  author: {
    id: string;
    name: string;
    honorific: string | null;
    avatarUrl: string | null;
  };
  replies: {
    id: string;
    content: string;
    createdAt: Date;
    editedAt: Date | null;
    paperVersion: number;
    author: {
      id: string;
      name: string;
      honorific: string | null;
      avatarUrl: string | null;
    };
  }[];
}

interface CommentSectionProps {
  paperId: string;
  comments: Comment[];
  currentUserId?: string;
  currentPaperVersion: number;
  isAdmin?: boolean;
}

function CommentForm({
  paperId,
  parentId,
  onCancel,
  placeholder,
}: {
  paperId: string;
  parentId?: string;
  onCancel?: () => void;
  placeholder?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<
    CommentActionResult,
    FormData
  >(async (_prev, formData) => {
    const result = await createComment(formData);
    if (result.success) {
      formRef.current?.reset();
      toast({ title: "Comment posted", variant: "success" });
    }
    return result;
  }, {});

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="paperId" value={paperId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Textarea
        name="content"
        aria-label="Write a comment"
        placeholder={placeholder ?? "Share your thoughts on this paper..."}
        rows={3}
        required
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          {parentId ? "Reply" : "Comment"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  paperId,
  currentUserId,
  currentPaperVersion,
  isReply = false,
  isAdmin = false,
}: {
  comment: Comment | Comment["replies"][0];
  paperId: string;
  currentUserId?: string;
  currentPaperVersion: number;
  isReply?: boolean;
  isAdmin?: boolean;
}) {
  const [showReply, setShowReply] = useState(false);
  const initials = getInitials(comment.author.name);

  const isOlderVersion = comment.paperVersion < currentPaperVersion;

  return (
    <div className={isReply ? "ml-12 border-l-2 border-border pl-5" : ""}>
      <div className="flex gap-4">
        <Link href={`/profiles/${comment.author.id}`}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/profiles/${comment.author.id}`}
              className="font-medium hover:underline"
            >
              {displayName(comment.author.name, comment.author.honorific)}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {comment.editedAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
            {isOlderVersion && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-muted-foreground"
              >
                v{comment.paperVersion}
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="flex items-center gap-3">
            {!isReply && currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowReply(!showReply)}
              >
                <Reply className="mr-1 h-3 w-3" />
                Reply
              </Button>
            )}
            {currentUserId && currentUserId !== comment.author.id && (
              <ReportButton
                targetType="COMMENT"
                targetId={comment.id}
                size="icon"
              />
            )}
            {isAdmin && (
              <DeleteCommentDialog
                commentId={comment.id}
              />
            )}
          </div>
        </div>
      </div>
      {showReply && (
        <div className="ml-12 mt-4">
          <CommentForm
            paperId={paperId}
            parentId={comment.id}
            onCancel={() => setShowReply(false)}
            placeholder="Write a reply..."
          />
        </div>
      )}
    </div>
  );
}

function DeleteCommentDialog({ commentId }: { commentId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    setIsPending(true);
    const result = await deleteCommentAdmin(commentId);
    setIsPending(false);
    if ("error" in result) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Comment deleted", variant: "success" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete comment?</DialogTitle>
          <DialogDescription>
            This will permanently delete this comment. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete Comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CommentSection({
  paperId,
  comments,
  currentUserId,
  currentPaperVersion,
  isAdmin,
}: CommentSectionProps) {
  return (
    <div className="space-y-8">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <MessageSquare className="h-5 w-5" />
        Comments ({comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)})
      </h2>

      {currentUserId ? (
        <CommentForm paperId={paperId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      <div className="space-y-8">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-4">
            <CommentItem
              comment={comment}
              paperId={paperId}
              currentUserId={currentUserId}
              currentPaperVersion={currentPaperVersion}
              isAdmin={isAdmin}
            />
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                paperId={paperId}
                currentUserId={currentUserId}
                currentPaperVersion={currentPaperVersion}
                isReply
                isAdmin={isAdmin}
              />
            ))}
          </div>
        ))}
        {comments.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              No comments yet
            </p>
            <p className="text-xs text-muted-foreground/70">
              Be the first to share your thoughts on this paper.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
