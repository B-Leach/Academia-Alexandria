import { describe, it, expect } from "vitest";
import { updateProfileSchema } from "@/lib/validators/profile";

describe("updateProfileSchema", () => {
  const valid = {
    name: "Jane Doe",
    bio: "Researcher in AI.",
    institution: "MIT",
    researchAreaIds: ["area-1", "area-2"],
  };

  it("should accept valid profile with all fields", () => {
    expect(updateProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("should reject name shorter than 2 characters", () => {
    expect(updateProfileSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("should reject name over 100 characters", () => {
    expect(updateProfileSchema.safeParse({ ...valid, name: "a".repeat(101) }).success).toBe(false);
  });

  it("should accept name with exactly 2 characters (boundary)", () => {
    expect(updateProfileSchema.safeParse({ ...valid, name: "Ab" }).success).toBe(true);
  });

  it("should accept name with exactly 100 characters (boundary)", () => {
    expect(updateProfileSchema.safeParse({ ...valid, name: "a".repeat(100) }).success).toBe(true);
  });

  it("should default bio to empty string when omitted", () => {
    const result = updateProfileSchema.safeParse({ name: "Jane Doe" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bio).toBe("");
  });

  it("should reject bio over 2000 characters", () => {
    expect(
      updateProfileSchema.safeParse({ ...valid, bio: "a".repeat(2001) }).success
    ).toBe(false);
  });

  it("should default institution to empty string when omitted", () => {
    const result = updateProfileSchema.safeParse({ name: "Jane Doe" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.institution).toBe("");
  });

  it("should reject institution over 200 characters", () => {
    expect(
      updateProfileSchema.safeParse({ ...valid, institution: "a".repeat(201) }).success
    ).toBe(false);
  });

  it("should default researchAreaIds to empty array when omitted", () => {
    const result = updateProfileSchema.safeParse({ name: "Jane Doe" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.researchAreaIds).toEqual([]);
  });

  it("should reject more than 10 research area IDs", () => {
    expect(
      updateProfileSchema.safeParse({
        ...valid,
        researchAreaIds: Array.from({ length: 11 }, (_, i) => `area-${i}`),
      }).success
    ).toBe(false);
  });
});
