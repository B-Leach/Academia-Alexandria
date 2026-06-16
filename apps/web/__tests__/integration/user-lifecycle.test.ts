import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import {
  cleanDatabase,
  createTestUser,
  setAuthenticatedAs,
  setUnauthenticated,
  resetCounters,
  buildFormData,
} from "./helpers";
import { RedirectError } from "./setup";

import { updateProfile, getProfile } from "@/actions/profile";
import { getReputationHistory, getReviewerStats } from "@/actions/reputation";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
  setUnauthenticated();
});

describe("User Lifecycle", () => {
  // ---------------------------------------------------------------
  // 1. Create user — verify stored with correct fields
  // ---------------------------------------------------------------
  it("should create a user and store correct fields in the database", async () => {
    const user = await createTestUser({
      name: "Alice Researcher",
      email: "alice@university.edu",
      reputationScore: 42,
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe("Alice Researcher");
    expect(user.email).toBe("alice@university.edu");
    expect(user.reputationScore).toBe(42);

    // Verify via a fresh query to confirm persistence
    const stored = await db.user.findUnique({ where: { id: user.id } });
    expect(stored).not.toBeNull();
    expect(stored!.name).toBe("Alice Researcher");
    expect(stored!.email).toBe("alice@university.edu");
    expect(stored!.reputationScore).toBe(42);
    expect(stored!.passwordHash).toBeDefined();
    expect(stored!.createdAt).toBeInstanceOf(Date);
  });

  // ---------------------------------------------------------------
  // 2. Duplicate email — verify unique constraint error
  // ---------------------------------------------------------------
  it("should reject creating a user with a duplicate email", async () => {
    await createTestUser({ email: "duplicate@example.com" });

    await expect(
      createTestUser({ email: "duplicate@example.com" })
    ).rejects.toThrow();

    // Verify only one user exists with that email
    const count = await db.user.count({
      where: { email: "duplicate@example.com" },
    });
    expect(count).toBe(1);
  });

  // ---------------------------------------------------------------
  // 3. updateProfile — updates name/bio/institution
  // ---------------------------------------------------------------
  it("should update name, bio, and institution via updateProfile", async () => {
    const user = await createTestUser({ name: "Original Name" });
    setAuthenticatedAs({ id: user.id, name: user.name, email: user.email });

    const formData = buildFormData({
      name: "Updated Name",
      bio: "Specializing in quantum computing and distributed systems.",
      institution: "Stanford University",
    });

    try {
      await updateProfile(formData);
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectError);
      expect((e as RedirectError).url).toBe(`/profiles/${user.id}`);
    }

    const updated = await db.user.findUnique({ where: { id: user.id } });
    expect(updated!.name).toBe("Updated Name");
    expect(updated!.bio).toBe(
      "Specializing in quantum computing and distributed systems."
    );
    expect(updated!.institution).toBe("Stanford University");
  });

  // ---------------------------------------------------------------
  // 4. updateProfile — replaces research areas with real seeded records
  // ---------------------------------------------------------------
  it("should replace research areas when updating profile", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name, email: user.email });

    // Fetch two real seeded research areas
    const cs = await db.researchArea.findFirst({
      where: { slug: "computer-science" },
    });
    const math = await db.researchArea.findFirst({
      where: { slug: "mathematics" },
    });
    expect(cs).not.toBeNull();
    expect(math).not.toBeNull();

    // First update: set two research areas
    const formData1 = buildFormData({
      name: "Area Tester",
      bio: "",
      institution: "",
      researchAreaIds: [cs!.id, math!.id],
    });

    try {
      await updateProfile(formData1);
    } catch {
      // RedirectError expected
    }

    let areas = await db.userResearchArea.findMany({
      where: { userId: user.id },
    });
    expect(areas).toHaveLength(2);
    const areaIds = areas.map((a) => a.researchAreaId).sort();
    expect(areaIds).toEqual([cs!.id, math!.id].sort());

    // Second update: replace with only one area
    const physics = await db.researchArea.findFirst({
      where: { slug: "physics" },
    });
    expect(physics).not.toBeNull();

    const formData2 = buildFormData({
      name: "Area Tester",
      bio: "",
      institution: "",
      researchAreaIds: [physics!.id],
    });

    try {
      await updateProfile(formData2);
    } catch {
      // RedirectError expected
    }

    areas = await db.userResearchArea.findMany({
      where: { userId: user.id },
    });
    expect(areas).toHaveLength(1);
    expect(areas[0].researchAreaId).toBe(physics!.id);
  });

  // ---------------------------------------------------------------
  // 5. updateProfile — clears research areas when empty array sent
  // ---------------------------------------------------------------
  it("should clear all research areas when an empty array is sent", async () => {
    const user = await createTestUser();
    setAuthenticatedAs({ id: user.id, name: user.name, email: user.email });

    // First, link a research area
    const cs = await db.researchArea.findFirst({
      where: { slug: "computer-science" },
    });
    expect(cs).not.toBeNull();

    const formWithAreas = buildFormData({
      name: "Clearing Test",
      bio: "",
      institution: "",
      researchAreaIds: [cs!.id],
    });

    try {
      await updateProfile(formWithAreas);
    } catch {
      // RedirectError expected
    }

    let areas = await db.userResearchArea.findMany({
      where: { userId: user.id },
    });
    expect(areas).toHaveLength(1);

    // Now send form without researchAreaIds (empty array)
    const formWithoutAreas = buildFormData({
      name: "Clearing Test",
      bio: "",
      institution: "",
    });

    try {
      await updateProfile(formWithoutAreas);
    } catch {
      // RedirectError expected
    }

    areas = await db.userResearchArea.findMany({
      where: { userId: user.id },
    });
    expect(areas).toHaveLength(0);
  });

  // ---------------------------------------------------------------
  // 6. getProfile — returns user with research areas
  // ---------------------------------------------------------------
  it("should return user profile with research areas via getProfile", async () => {
    const user = await createTestUser({
      name: "Profile User",
      email: "profile@example.com",
    });

    // Attach research areas directly via DB
    const cs = await db.researchArea.findFirst({
      where: { slug: "computer-science" },
    });
    const bio = await db.researchArea.findFirst({
      where: { slug: "biology" },
    });
    expect(cs).not.toBeNull();
    expect(bio).not.toBeNull();

    await db.userResearchArea.createMany({
      data: [
        { userId: user.id, researchAreaId: cs!.id },
        { userId: user.id, researchAreaId: bio!.id },
      ],
    });

    const profile = await getProfile(user.id);

    expect(profile).not.toBeNull();
    expect(profile!.id).toBe(user.id);
    expect(profile!.name).toBe("Profile User");
    expect(profile!.email).toBe("profile@example.com");
    expect(profile!.researchAreas).toHaveLength(2);

    const slugs = profile!.researchAreas
      .map((ra) => ra.researchArea.slug)
      .sort();
    expect(slugs).toEqual(["biology", "computer-science"]);

    // authoredPapers should be empty for a fresh user
    expect(profile!.authoredPapers).toHaveLength(0);
  });

  // ---------------------------------------------------------------
  // 7. getReputationHistory — returns empty for new user
  // ---------------------------------------------------------------
  it("should return empty reputation history for a new user", async () => {
    const user = await createTestUser();

    const history = await getReputationHistory(user.id);

    expect(history).toEqual([]);
  });

  // ---------------------------------------------------------------
  // 8. getReviewerStats — returns zeros for new user
  // ---------------------------------------------------------------
  it("should return zero reviewer stats for a new user", async () => {
    const user = await createTestUser();

    const stats = await getReviewerStats(user.id);

    expect(stats.reviewCount).toBe(0);
    expect(stats.endorsementsGiven).toBe(0);
  });
});
