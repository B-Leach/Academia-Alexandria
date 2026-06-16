import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import { setAuthenticated, setUnauthenticated } from "../helpers/mock-auth";
import { buildFormData } from "../helpers/form-data";
import { revalidatePath } from "next/cache";
import { RedirectError } from "../setup";

import {
  updateProfile,
  updateNotificationPreferences,
  getProfileMetrics,
} from "@/actions/profile";

beforeEach(() => {
  setAuthenticated();
  vi.mocked(revalidatePath).mockReset();
});

describe("updateProfile", () => {
  const validForm = () =>
    buildFormData({
      name: "Jane Doe",
      bio: "AI researcher",
      institution: "MIT",
      researchAreaIds: ["area-1", "area-2"],
    });

  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await updateProfile(validForm());
    expect(result.error).toContain("signed in");
  });

  it("should return error for invalid name (too short)", async () => {
    const fd = buildFormData({ name: "A" });
    const result = await updateProfile(fd);
    expect(result.error).toBeDefined();
  });

  it("should update user profile successfully", async () => {
    prismaMock.researchArea.count.mockResolvedValue(2);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.userResearchArea.deleteMany.mockResolvedValue({} as any);
    prismaMock.userResearchArea.createMany.mockResolvedValue({} as any);

    await expect(updateProfile(validForm())).rejects.toThrow(RedirectError);
  });

  it("should replace existing research areas (delete old, create new)", async () => {
    prismaMock.researchArea.count.mockResolvedValue(2);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.userResearchArea.deleteMany.mockResolvedValue({} as any);
    prismaMock.userResearchArea.createMany.mockResolvedValue({} as any);

    try {
      await updateProfile(validForm());
    } catch {
      /* redirect */
    }

    expect(prismaMock.userResearchArea.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      }),
    );
  });

  it("should handle empty researchAreaIds", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.userResearchArea.deleteMany.mockResolvedValue({} as any);
    prismaMock.userResearchArea.createMany.mockResolvedValue({} as any);

    const fd = buildFormData({ name: "Jane Doe", bio: "", institution: "" });
    try {
      await updateProfile(fd);
    } catch {
      /* redirect */
    }

    expect(prismaMock.userResearchArea.deleteMany).toHaveBeenCalled();
  });

  it("should return error for invalid research area IDs", async () => {
    prismaMock.researchArea.count.mockResolvedValue(1); // only 1 of 2 exists

    const result = await updateProfile(validForm());
    expect(result.error).toContain("research areas are invalid");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should redirect to profile page after update", async () => {
    prismaMock.researchArea.count.mockResolvedValue(2);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.userResearchArea.deleteMany.mockResolvedValue({} as any);
    prismaMock.userResearchArea.createMany.mockResolvedValue({} as any);

    try {
      await updateProfile(validForm());
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectError);
      expect((e as RedirectError).url).toContain("/profiles/user-1");
    }
  });

  it("should call revalidatePath for profile and settings", async () => {
    prismaMock.researchArea.count.mockResolvedValue(2);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.user.update.mockResolvedValue({} as any);
    prismaMock.userResearchArea.deleteMany.mockResolvedValue({} as any);
    prismaMock.userResearchArea.createMany.mockResolvedValue({} as any);

    try {
      await updateProfile(validForm());
    } catch {
      /* redirect */
    }

    expect(revalidatePath).toHaveBeenCalledWith("/profiles/user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });
});

// -----------------------------------------------------------------------
// updateNotificationPreferences
// -----------------------------------------------------------------------
describe("updateNotificationPreferences", () => {
  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const fd = buildFormData({});
    const result = await updateNotificationPreferences(fd);
    expect(result.error).toContain("signed in");
  });

  it("should update all preferences to true when all are 'on'", async () => {
    prismaMock.user.update.mockResolvedValue({} as any);

    const fd = buildFormData({
      notifyReviews: "on",
      notifyComments: "on",
      notifyEndorsements: "on",
      notifyPaperStatus: "on",
      notifyBounty: "on",
      notifyInvitations: "on",
    });

    const result = await updateNotificationPreferences(fd);
    expect(result.success).toBe(true);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        notifyReviews: true,
        notifyComments: true,
        notifyEndorsements: true,
        notifyPaperStatus: true,
        notifyBounty: true,
        notifyInvitations: true,
      },
    });
  });

  it("should update all preferences to false when all are 'off'", async () => {
    prismaMock.user.update.mockResolvedValue({} as any);

    const fd = buildFormData({
      notifyReviews: "off",
      notifyComments: "off",
      notifyEndorsements: "off",
      notifyPaperStatus: "off",
      notifyBounty: "off",
      notifyInvitations: "off",
    });

    const result = await updateNotificationPreferences(fd);
    expect(result.success).toBe(true);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        notifyReviews: false,
        notifyComments: false,
        notifyEndorsements: false,
        notifyPaperStatus: false,
        notifyBounty: false,
        notifyInvitations: false,
      },
    });
  });

  it("should handle mixed preferences", async () => {
    prismaMock.user.update.mockResolvedValue({} as any);

    const fd = buildFormData({
      notifyReviews: "on",
      notifyComments: "off",
      notifyEndorsements: "on",
      notifyPaperStatus: "off",
      notifyBounty: "on",
      notifyInvitations: "off",
    });

    const result = await updateNotificationPreferences(fd);
    expect(result.success).toBe(true);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        notifyReviews: true,
        notifyComments: false,
        notifyEndorsements: true,
        notifyPaperStatus: false,
        notifyBounty: true,
        notifyInvitations: false,
      },
    });
  });

  it("should call revalidatePath for settings", async () => {
    prismaMock.user.update.mockResolvedValue({} as any);

    const fd = buildFormData({
      notifyReviews: "on",
      notifyComments: "on",
      notifyEndorsements: "on",
      notifyPaperStatus: "on",
      notifyBounty: "on",
      notifyInvitations: "on",
    });

    await updateNotificationPreferences(fd);

    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });
});

// -----------------------------------------------------------------------
// getProfileMetrics
// -----------------------------------------------------------------------
describe("getProfileMetrics", () => {
  it("should return aggregated metrics for a user", async () => {
    prismaMock.paperAuthor.count
      .mockResolvedValueOnce(3) // publishedCount
      .mockResolvedValueOnce(1); // submittedCount
    prismaMock.paper.aggregate.mockResolvedValue({
      _sum: { viewCount: 150 },
    } as any);
    prismaMock.endorsement.count.mockResolvedValue(5);
    (prismaMock.review.groupBy as any).mockResolvedValue([
      { recommendation: "SOUND", _count: 4 },
      { recommendation: "NEEDS_REVISION", _count: 1 },
    ] as any);

    const result = await getProfileMetrics("user-1");

    expect(result.publishedCount).toBe(3);
    expect(result.submittedCount).toBe(1);
    expect(result.totalViews).toBe(150);
    expect(result.endorsementsReceived).toBe(5);
    expect(result.reviewsOnPapers.sound).toBe(4);
    expect(result.reviewsOnPapers.needsRevision).toBe(1);
    expect(result.reviewsOnPapers.unsound).toBe(0);
  });

  it("should return zeros for a new user with no papers", async () => {
    prismaMock.paperAuthor.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.paper.aggregate.mockResolvedValue({
      _sum: { viewCount: null },
    } as any);
    prismaMock.endorsement.count.mockResolvedValue(0);
    (prismaMock.review.groupBy as any).mockResolvedValue([] as any);

    const result = await getProfileMetrics("new-user");

    expect(result.publishedCount).toBe(0);
    expect(result.submittedCount).toBe(0);
    expect(result.totalViews).toBe(0);
    expect(result.endorsementsReceived).toBe(0);
    expect(result.reviewsOnPapers.sound).toBe(0);
    expect(result.reviewsOnPapers.needsRevision).toBe(0);
    expect(result.reviewsOnPapers.unsound).toBe(0);
  });
});
