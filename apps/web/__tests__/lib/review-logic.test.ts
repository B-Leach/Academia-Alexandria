import { describe, it, expect } from "vitest";
import { isQualifyingReview } from "@/lib/review-logic";

describe("isQualifyingReview", () => {
  it("should return false when confidence is high but no discipline overlap", () => {
    expect(isQualifyingReview(5, [], [])).toBe(false);
    expect(isQualifyingReview(4, ["physics"], ["machine-learning"])).toBe(
      false,
    );
    expect(isQualifyingReview(3, [], ["computer-science"])).toBe(false);
  });

  it("should return false when confidence is low and no discipline overlap", () => {
    expect(isQualifyingReview(1, ["physics"], ["machine-learning"])).toBe(
      false,
    );
    expect(isQualifyingReview(2, ["biology"], ["computer-science"])).toBe(
      false,
    );
  });

  it("should return true when disciplines overlap regardless of confidence level", () => {
    expect(
      isQualifyingReview(1, ["machine-learning"], ["machine-learning"]),
    ).toBe(true);
    expect(isQualifyingReview(2, ["physics"], ["physics", "math"])).toBe(true);
    expect(isQualifyingReview(3, ["biology"], ["biology"])).toBe(true);
    expect(isQualifyingReview(5, ["physics"], ["physics"])).toBe(true);
  });

  it("should return false with empty reviewer slugs", () => {
    expect(isQualifyingReview(5, [], ["machine-learning"])).toBe(false);
  });

  it("should return false with empty paper disciplines", () => {
    expect(isQualifyingReview(5, ["machine-learning"], [])).toBe(false);
  });

  it("should return false when both arrays are empty", () => {
    expect(isQualifyingReview(5, [], [])).toBe(false);
  });

  it("should match on any overlapping discipline (partial overlap)", () => {
    expect(
      isQualifyingReview(
        2,
        ["biology", "chemistry", "physics"],
        ["math", "physics", "engineering"],
      ),
    ).toBe(true);
  });
});
