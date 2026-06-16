"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleBookmark } from "@/actions/bookmark";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  paperId: string;
  isBookmarked: boolean;
  size?: "sm" | "default";
}

export function BookmarkButton({
  paperId,
  isBookmarked: initialBookmarked,
  size = "default",
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const prev = bookmarked;
    setBookmarked(!prev);

    startTransition(async () => {
      const result = await toggleBookmark(paperId);
      if (result.error) {
        setBookmarked(prev);
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else if (result.bookmarked !== undefined) {
        setBookmarked(result.bookmarked);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "shrink-0",
        size === "sm" && "h-8 w-8",
        bookmarked && "text-primary",
      )}
      onClick={handleToggle}
      disabled={isPending}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this paper"}
    >
      <Bookmark
        className={cn(
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          bookmarked && "fill-current",
        )}
      />
    </Button>
  );
}
