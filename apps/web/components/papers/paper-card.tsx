import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  DollarSign,
  EyeOff,
  MessageSquare,
  ShieldCheck,
  Star,
  ThumbsUp,
} from "lucide-react";
import { cn, displayName, formatRelativeTime } from "@/lib/utils";
import { BookmarkButton } from "@/components/papers/bookmark-button";

interface PaperCardProps {
  paper: {
    id: string;
    title: string;
    abstract: string;
    disciplines: string[];
    keywords?: string[];
    status: string;
    isBlindSubmission?: boolean;
    publishedAt: Date | null;
    commentCount: number;
    reviewCount: number;
    endorsementCount: number;
    authors: {
      user: { id: string; name: string; honorific?: string | null };
      order: number;
    }[];
    bounty?: {
      totalAmountCents: number;
      status: string;
    } | null;
  };
  isBookmarked?: boolean;
}

export function PaperCard({ paper, isBookmarked }: PaperCardProps) {
  const isBlindAndSubmitted =
    paper.isBlindSubmission && paper.status === "SUBMITTED";
  const authorNames = isBlindAndSubmitted
    ? "Authors hidden for blind review"
    : paper.authors
        .sort((a, b) => a.order - b.order)
        .map((a) => displayName(a.user.name, a.user.honorific))
        .join(", ");

  return (
    <Card
      className={cn(
        "relative transition-colors hover:border-primary/50",
        paper.status === "PUBLISHED" && "border-l-4 border-l-green-500",
        paper.status === "SUBMITTED" && "border-l-4 border-l-blue-500",
        paper.status === "RETRACTED" &&
          "border-l-4 border-l-red-500 opacity-75",
      )}
    >
      <Link href={`/papers/${paper.id}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-lg leading-snug line-clamp-2">
              {paper.title}
            </CardTitle>
            {paper.status === "PUBLISHED" && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 bg-green-500/10 text-green-700 dark:text-green-400"
              >
                <ShieldCheck className="h-3 w-3" />
                Peer Reviewed
              </Badge>
            )}
            {paper.status === "SUBMITTED" && (
              <Badge
                variant="secondary"
                className="shrink-0 text-blue-700 bg-blue-500/10 dark:text-blue-400"
              >
                Submitted
              </Badge>
            )}
            {paper.status === "RETRACTED" && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 bg-red-500/10 text-red-700 dark:text-red-400"
              >
                <AlertTriangle className="h-3 w-3" />
                Retracted
              </Badge>
            )}
            {isBlindAndSubmitted && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1"
              >
                <EyeOff className="h-3 w-3" />
                Blind Review
              </Badge>
            )}
            {paper.bounty?.status === "ACTIVE" && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                <DollarSign className="h-3 w-3" />
                {(paper.bounty.totalAmountCents / 100).toFixed(0)} Bounty
              </Badge>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="line-clamp-1">{authorNames}</span>
            {paper.publishedAt && (
              <>
                <span>&middot;</span>
                <span className="shrink-0">
                  {formatRelativeTime(paper.publishedAt)}
                </span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {paper.abstract}
          </p>
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-wrap gap-1.5">
              {paper.disciplines.map((d) => (
                <Badge key={d} variant="secondary" className="text-xs">
                  {d
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {paper.commentCount}
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {paper.reviewCount}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {paper.endorsementCount}
              </span>
              {isBookmarked !== undefined && (
                <BookmarkButton
                  paperId={paper.id}
                  isBookmarked={isBookmarked}
                  size="sm"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
