import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import {
  setAuthenticated,
  setUnauthenticated,
} from "../helpers/mock-auth";
import {
  getAdminStats,
  getAdminUsers,
  getAdminUser,
  banUser,
  unbanUser,
  getAdminPapers,
  retractPaper,
} from "@/actions/admin";

const adminSession = {
  user: { id: "admin-1", name: "Admin User", email: "admin@example.com", role: "ADMIN" as const },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const moderatorSession = {
  user: { id: "mod-1", name: "Mod User", email: "mod@example.com", role: "MODERATOR" as const },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const regularSession = {
  user: { id: "user-1", name: "Test User", email: "test@example.com", role: "USER" as const },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

beforeEach(() => {
  setAuthenticated(adminSession);
});

// ============================================================
// requireAdmin (tested indirectly through every action)
// ============================================================

describe("requireAdmin", () => {
  it("should throw when not authenticated", async () => {
    setUnauthenticated();
    await expect(getAdminStats()).rejects.toThrow("Unauthorized");
  });

  it("should throw when user is not admin or moderator", async () => {
    setAuthenticated(regularSession);
    await expect(getAdminStats()).rejects.toThrow("Unauthorized");
  });

  it("should allow moderator access to read-only actions", async () => {
    setAuthenticated(moderatorSession);
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.paper.count.mockResolvedValue(0);
    (prismaMock.paper.groupBy as any).mockResolvedValue([] as any);
    prismaMock.review.count.mockResolvedValue(0);
    prismaMock.endorsement.count.mockResolvedValue(0);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.paper.findMany.mockResolvedValue([]);

    const stats = await getAdminStats();
    expect(stats.totalUsers).toBe(0);
  });

  it("should throw when session has no user id", async () => {
    setAuthenticated({
      user: { id: "", name: "No ID", email: "noid@test.com", role: "ADMIN" as const },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    await expect(getAdminStats()).rejects.toThrow("Unauthorized");
  });
});

// ============================================================
// getAdminStats
// ============================================================

describe("getAdminStats", () => {
  it("should return platform statistics", async () => {
    prismaMock.user.count.mockResolvedValue(10);
    prismaMock.paper.count.mockResolvedValue(5);
    (prismaMock.paper.groupBy as any).mockResolvedValue([
      { status: "DRAFT", _count: 2 },
      { status: "PUBLISHED", _count: 3 },
    ] as any);
    prismaMock.review.count.mockResolvedValue(7);
    prismaMock.endorsement.count.mockResolvedValue(3);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.paper.findMany.mockResolvedValue([]);

    const stats = await getAdminStats();

    expect(stats.totalUsers).toBe(10);
    expect(stats.totalPapers).toBe(5);
    expect(stats.totalReviews).toBe(7);
    expect(stats.totalEndorsements).toBe(3);
    expect(stats.statusCounts).toEqual({ DRAFT: 2, PUBLISHED: 3 });
  });
});

// ============================================================
// getAdminUsers
// ============================================================

describe("getAdminUsers", () => {
  it("should return paginated user list", async () => {
    const mockUsers = [
      { id: "u1", name: "Alice", email: "alice@test.com", role: "USER", reputationScore: 100, createdAt: new Date(), bannedAt: null },
    ];
    prismaMock.user.findMany.mockResolvedValue(mockUsers as any);
    prismaMock.user.count.mockResolvedValue(1);

    const result = await getAdminUsers({});

    expect(result.users).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
  });

  it("should search by query string", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);

    await getAdminUsers({ query: "alice" });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "alice", mode: "insensitive" } },
            { email: { contains: "alice", mode: "insensitive" } },
          ],
        },
      })
    );
  });

  it("should handle pagination", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(45);

    const result = await getAdminUsers({ page: "2" });

    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 })
    );
  });

  it("should reject non-admin users", async () => {
    setAuthenticated(regularSession);
    await expect(getAdminUsers({})).rejects.toThrow("Unauthorized");
  });
});

// ============================================================
// getAdminUser
// ============================================================

describe("getAdminUser", () => {
  it("should return user details", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      name: "Alice",
      email: "alice@test.com",
      role: "USER",
      institution: "MIT",
      bio: "A researcher",
      reputationScore: 100,
      createdAt: new Date(),
      bannedAt: null,
      bannedReason: null,
      _count: { authoredPapers: 3, reviews: 2, endorsementsGiven: 1, comments: 5 },
    } as any);

    const user = await getAdminUser("u1");

    expect(user).not.toBeNull();
    expect(user!.name).toBe("Alice");
    expect(user!._count.authoredPapers).toBe(3);
  });

  it("should return null for non-existent user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const user = await getAdminUser("nonexistent");
    expect(user).toBeNull();
  });
});

// ============================================================
// banUser
// ============================================================

describe("banUser", () => {
  it("should ban a regular user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: "USER",
      bannedAt: null,
    } as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const result = await banUser("user-2", "Spam");

    expect("success" in result && result.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-2" },
        data: expect.objectContaining({
          bannedReason: "Spam",
        }),
      })
    );
  });

  it("should prevent banning yourself", async () => {
    const result = await banUser("admin-1", "Testing");

    expect("error" in result && result.error).toBe("You cannot ban yourself");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("should prevent banning another admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: "ADMIN",
      bannedAt: null,
    } as any);

    const result = await banUser("admin-2", "Reason");

    expect("error" in result && result.error).toBe("Cannot ban an admin or moderator");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("should prevent banning a moderator", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: "MODERATOR",
      bannedAt: null,
    } as any);

    const result = await banUser("mod-1", "Reason");

    expect("error" in result && result.error).toBe("Cannot ban an admin or moderator");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("should return error if user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await banUser("nonexistent", "Reason");

    expect("error" in result && result.error).toBe("User not found");
  });

  it("should return error if user already banned", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: "USER",
      bannedAt: new Date(),
    } as any);

    const result = await banUser("user-2", "Reason");

    expect("error" in result && result.error).toBe("User is already banned");
  });

  it("should use default reason when empty", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      role: "USER",
      bannedAt: null,
    } as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await banUser("user-2", "");

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bannedReason: "No reason provided",
        }),
      })
    );
  });
});

// ============================================================
// unbanUser
// ============================================================

describe("unbanUser", () => {
  it("should unban a banned user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      bannedAt: new Date(),
    } as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const result = await unbanUser("user-2");

    expect("success" in result && result.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-2" },
        data: { bannedAt: null, bannedReason: null },
      })
    );
  });

  it("should return error if user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await unbanUser("nonexistent");

    expect("error" in result && result.error).toBe("User not found");
  });

  it("should return error if user is not banned", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      bannedAt: null,
    } as any);

    const result = await unbanUser("user-2");

    expect("error" in result && result.error).toBe("User is not banned");
  });
});

// ============================================================
// getAdminPapers
// ============================================================

describe("getAdminPapers", () => {
  it("should return paginated paper list", async () => {
    const mockPapers = [
      {
        id: "p1",
        title: "Test Paper",
        status: "PUBLISHED",
        createdAt: new Date(),
        authors: [{ user: { id: "u1", name: "Alice" }, order: 0 }],
      },
    ];
    prismaMock.paper.findMany.mockResolvedValue(mockPapers as any);
    prismaMock.paper.count.mockResolvedValue(1);

    const result = await getAdminPapers({});

    expect(result.papers).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it("should filter by status", async () => {
    prismaMock.paper.findMany.mockResolvedValue([]);
    prismaMock.paper.count.mockResolvedValue(0);

    await getAdminPapers({ status: "RETRACTED" });

    expect(prismaMock.paper.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "RETRACTED" },
      })
    );
  });

  it("should not filter status when empty", async () => {
    prismaMock.paper.findMany.mockResolvedValue([]);
    prismaMock.paper.count.mockResolvedValue(0);

    await getAdminPapers({});

    expect(prismaMock.paper.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
  });

  it("should handle pagination", async () => {
    prismaMock.paper.findMany.mockResolvedValue([]);
    prismaMock.paper.count.mockResolvedValue(50);

    const result = await getAdminPapers({ page: "3" });

    expect(result.currentPage).toBe(3);
    expect(result.totalPages).toBe(3);
    expect(prismaMock.paper.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 })
    );
  });
});

// ============================================================
// retractPaper
// ============================================================

describe("retractPaper", () => {
  it("should retract a published paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "PUBLISHED",
    } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    const result = await retractPaper("p1", "Fabricated data");

    expect("success" in result && result.success).toBe(true);
    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({
          status: "RETRACTED",
          retractedReason: "Fabricated data",
          retractedById: "admin-1",
        }),
      })
    );
  });

  it("should retract a submitted paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
    } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    const result = await retractPaper("p1", "Plagiarism detected");

    expect("success" in result && result.success).toBe(true);
  });

  it("should return error for non-existent paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(null);

    const result = await retractPaper("nonexistent", "Reason");

    expect("error" in result && result.error).toBe("Paper not found");
  });

  it("should not retract a draft", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "DRAFT",
    } as any);

    const result = await retractPaper("p1", "Reason");

    expect("error" in result && result.error).toBe("Cannot retract a draft");
    expect(prismaMock.paper.update).not.toHaveBeenCalled();
  });

  it("should not retract an already retracted paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "RETRACTED",
    } as any);

    const result = await retractPaper("p1", "Reason");

    expect("error" in result && result.error).toBe("Paper is already retracted");
    expect(prismaMock.paper.update).not.toHaveBeenCalled();
  });

  it("should use default reason when empty", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "PUBLISHED",
    } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await retractPaper("p1", "");

    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          retractedReason: "No reason provided",
        }),
      })
    );
  });
});
