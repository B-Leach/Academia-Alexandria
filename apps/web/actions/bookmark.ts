"use server";

import { requireUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { rateLimitByUser } from "@/lib/rate-limit";
import { paperListSelect } from "@/lib/selects";

interface BookmarkActionResult {
  error?: string;
  bookmarked?: boolean;
}

export async function toggleBookmark(
  paperId: string,
): Promise<BookmarkActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const existing = await db.bookmark.findUnique({
    where: {
      userId_paperId: { userId, paperId },
    },
  });

  if (existing) {
    await db.bookmark.delete({
      where: {
        userId_paperId: { userId, paperId },
      },
    });
    revalidatePath(`/papers/${paperId}`);
    return { bookmarked: false };
  }

  await db.bookmark.create({
    data: { userId, paperId },
  });
  revalidatePath(`/papers/${paperId}`);
  return { bookmarked: true };
}

export async function getBookmarkedPaperIds(): Promise<Set<string>> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return new Set();

  const bookmarks = await db.bookmark.findMany({
    where: { userId: authResult.id },
    select: { paperId: true },
  });

  return new Set(bookmarks.map((b) => b.paperId));
}

const BOOKMARKS_PER_PAGE = 12;

export async function getBookmarks(page: number = 1) {
  const authResult = await requireUser();
  if (typeof authResult === "string") {
    return { papers: [], totalCount: 0, totalPages: 0 };
  }

  const skip = (page - 1) * BOOKMARKS_PER_PAGE;

  const [bookmarks, totalCount] = await Promise.all([
    db.bookmark.findMany({
      where: { userId: authResult.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: BOOKMARKS_PER_PAGE,
      select: {
        paper: {
          select: paperListSelect,
        },
      },
    }),
    db.bookmark.count({
      where: { userId: authResult.id },
    }),
  ]);

  return {
    papers: bookmarks.map((b) => b.paper),
    totalCount,
    totalPages: Math.ceil(totalCount / BOOKMARKS_PER_PAGE),
  };
}
