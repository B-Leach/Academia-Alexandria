import { describe, it, expect } from "vitest";
import { createReviewSchema } from "@/lib/validators/review";

describe("createReviewSchema", () => {
  const valid = {
    paperId: "paper-1",
    methodologyScore: 7,
    noveltyScore: 6,
    clarityScore: 8,
    reproducibilityScore: 5,
    ethicsScore: 9,
    summary:
      "This is a solid and comprehensive summary of the paper review that covers the key findings, methodology, and contributions to the field of study.",
    strengthsText:
      "The methodology is well designed and rigorous, with a clear experimental setup, proper controls, and appropriate statistical analysis throughout the study.",
    weaknessesText:
      "The sample size could be larger for statistical significance and the literature review could be more comprehensive to better situate the work in context.",
    detailedComments: "",
    recommendation: "SOUND",
    confidenceLevel: 3,
  };

  it("should accept valid review data with all fields", () => {
    expect(createReviewSchema.safeParse(valid).success).toBe(true);
  });

  it("should reject missing paperId", () => {
    const { paperId, ...rest } = valid;
    expect(createReviewSchema.safeParse(rest).success).toBe(false);
  });

  it("should reject methodologyScore below 1", () => {
    const result = createReviewSchema.safeParse({
      ...valid,
      methodologyScore: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject methodologyScore above 10", () => {
    const result = createReviewSchema.safeParse({
      ...valid,
      methodologyScore: 11,
    });
    expect(result.success).toBe(false);
  });

  it("should coerce string score values to numbers", () => {
    const result = createReviewSchema.safeParse({
      ...valid,
      methodologyScore: "7",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.methodologyScore).toBe(7);
  });

  it("should reject noveltyScore below 1", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, noveltyScore: 0 }).success,
    ).toBe(false);
  });

  it("should reject clarityScore above 10", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, clarityScore: 11 }).success,
    ).toBe(false);
  });

  it("should reject reproducibilityScore as non-integer", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, reproducibilityScore: 5.5 })
        .success,
    ).toBe(false);
  });

  it("should reject ethicsScore below 1", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, ethicsScore: 0 }).success,
    ).toBe(false);
  });

  it("should reject summary shorter than 100 characters", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, summary: "Short" }).success,
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({ ...valid, summary: "a".repeat(99) })
        .success,
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({ ...valid, summary: "a".repeat(100) })
        .success,
    ).toBe(true);
  });

  it("should reject summary over 5000 characters", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, summary: "a".repeat(5001) })
        .success,
    ).toBe(false);
  });

  it("should reject strengthsText shorter than 100 characters", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, strengthsText: "Short" })
        .success,
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({ ...valid, strengthsText: "a".repeat(99) })
        .success,
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({ ...valid, strengthsText: "a".repeat(100) })
        .success,
    ).toBe(true);
  });

  it("should reject strengthsText over 5000 characters", () => {
    expect(
      createReviewSchema.safeParse({
        ...valid,
        strengthsText: "a".repeat(5001),
      }).success,
    ).toBe(false);
  });

  it("should reject weaknessesText shorter than 100 characters", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, weaknessesText: "Short" })
        .success,
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({ ...valid, weaknessesText: "a".repeat(99) })
        .success,
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({
        ...valid,
        weaknessesText: "a".repeat(100),
      }).success,
    ).toBe(true);
  });

  it("should reject weaknessesText over 5000 characters", () => {
    expect(
      createReviewSchema.safeParse({
        ...valid,
        weaknessesText: "a".repeat(5001),
      }).success,
    ).toBe(false);
  });

  it("should default detailedComments to empty string when omitted", () => {
    const { detailedComments, ...rest } = valid;
    const result = createReviewSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.detailedComments).toBe("");
  });

  it("should reject detailedComments over 10000 characters", () => {
    expect(
      createReviewSchema.safeParse({
        ...valid,
        detailedComments: "a".repeat(10001),
      }).success,
    ).toBe(false);
  });

  it("should accept SOUND recommendation", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, recommendation: "SOUND" })
        .success,
    ).toBe(true);
  });

  it("should accept NEEDS_REVISION recommendation", () => {
    expect(
      createReviewSchema.safeParse({
        ...valid,
        recommendation: "NEEDS_REVISION",
      }).success,
    ).toBe(true);
  });

  it("should accept UNSOUND recommendation", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, recommendation: "UNSOUND" })
        .success,
    ).toBe(true);
  });

  it("should reject invalid recommendation value", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, recommendation: "NEUTRAL" })
        .success,
    ).toBe(false);
    expect(
      createReviewSchema.safeParse({
        ...valid,
        recommendation: "STRONG_ACCEPT",
      }).success,
    ).toBe(false);
  });

  it("should reject confidenceLevel below 1", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, confidenceLevel: 0 }).success,
    ).toBe(false);
  });

  it("should reject confidenceLevel above 5", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, confidenceLevel: 6 }).success,
    ).toBe(false);
  });

  it("should accept boundary scores (1 and 10)", () => {
    const withBoundary = {
      ...valid,
      methodologyScore: 1,
      noveltyScore: 10,
      clarityScore: 1,
      reproducibilityScore: 10,
      ethicsScore: 1,
    };
    expect(createReviewSchema.safeParse(withBoundary).success).toBe(true);
  });

  it("should accept boundary confidence (1 and 5)", () => {
    expect(
      createReviewSchema.safeParse({ ...valid, confidenceLevel: 1 }).success,
    ).toBe(true);
    expect(
      createReviewSchema.safeParse({ ...valid, confidenceLevel: 5 }).success,
    ).toBe(true);
  });
});
