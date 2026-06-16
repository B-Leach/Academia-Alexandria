import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import { setAuthenticated, setUnauthenticated } from "../helpers/mock-auth";
import { revalidatePath } from "next/cache";

import {
  toggleBookmark,
  getBookmarkedPaperIds,
  getBookmarks,
} from "@/actions/bookmark";

beforeEach(() => {
  setAuthenticated();
  vi.mocked(revalidatePath).mockReset();
});

describe("toggleBookmark", () => {
  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await toggleBookmark("paper-1");
    expect(result.error).toContain("signed in");
  });

  it("should create bookmark when none exists", async () => {
    prismaMock.bookmark.findUnique.mockResolvedValue(null);
    prismaMock.bookmark.create.mockResolvedValue({
      userId: "user-1",
      paperId: "paper-1",
      createdAt: new Date(),
    });

    const result = await toggleBookmark("paper-1");

    expect(result.bookmarked).toBe(true);
    expect(prismaMock.bookmark.create).toHaveBeenCalledWith({
      data: { userId: "user-1", paperId: "paper-1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/papers/paper-1");
  });

  it("should delete bookmark when one exists", async () => {
    prismaMock.bookmark.findUnique.mockResolvedValue({
      userId: "user-1",
      paperId: "paper-1",
      createdAt: new Date(),
    });
    prismaMock.bookmark.delete.mockResolvedValue({} as any);

    const result = await toggleBookmark("paper-1");

    expect(result.bookmarked).toBe(false);
    expect(prismaMock.bookmark.delete).toHaveBeenCalledWith({
      where: {
        userId_paperId: { userId: "user-1", paperId: "paper-1" },
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/papers/paper-1");
  });
});

describe("getBookmarkedPaperIds", () => {
  it("should return empty set when not signed in", async () => {
    setUnauthenticated();
    const result = await getBookmarkedPaperIds();
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it("should return set of bookmarked paper IDs", async () => {
    prismaMock.bookmark.findMany.mockResolvedValue([
      { paperId: "paper-1" },
      { paperId: "paper-2" },
      { paperId: "paper-3" },
    ] as any);

    const result = await getBookmarkedPaperIds();

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(3);
    expect(result.has("paper-1")).toBe(true);
    expect(result.has("paper-2")).toBe(true);
    expect(result.has("paper-3")).toBe(true);
    expect(result.has("paper-4")).toBe(false);
  });
});

describe("getBookmarks", () => {
  it("should return empty result when not signed in", async () => {
    setUnauthenticated();
    const result = await getBookmarks(1);
    expect(result.papers).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("should return paginated bookmarked papers", async () => {
    const mockPaper = {
      id: "paper-1",
      title: "Test Paper",
      abstract: "Abstract",
      status: "PUBLISHED",
      isBlindSubmission: false,
      disciplines: ["physics"],
      keywords: [],
      publishedAt: new Date(),
      commentCount: 0,
      reviewCount: 0,
      endorsementCount: 0,
      authors: [{ user: { id: "author-1", name: "Author", honorific: null }, order: 1 }],
      bounty: null,
    };

    prismaMock.bookmark.findMany.mockResolvedValue([
      { paper: mockPaper },
    ] as any);
    prismaMock.bookmark.count.mockResolvedValue(1);

    const result = await getBookmarks(1);

    expect(result.papers).toHaveLength(1);
    expect(result.papers[0].id).toBe("paper-1");
    expect(result.totalCount).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("should calculate total pages correctly", async () => {
    prismaMock.bookmark.findMany.mockResolvedValue([] as any);
    prismaMock.bookmark.count.mockResolvedValue(25);

    const result = await getBookmarks(1);

    expect(result.totalPages).toBe(3); // 25 / 12 = 2.08 -> ceil = 3
  });
});
