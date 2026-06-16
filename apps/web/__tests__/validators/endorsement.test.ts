import { describe, it, expect } from "vitest";
import { createEndorsementSchema } from "@/lib/validators/endorsement";

describe("createEndorsementSchema", () => {
  it("should accept valid endorsement with paperId and statement", () => {
    const result = createEndorsementSchema.safeParse({
      paperId: "paper-1",
      statement: "This is a great paper.",
    });
    expect(result.success).toBe(true);
  });

  it("should accept endorsement without statement (defaults to empty)", () => {
    const result = createEndorsementSchema.safeParse({ paperId: "paper-1" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.statement).toBe("");
  });

  it("should reject missing paperId", () => {
    const result = createEndorsementSchema.safeParse({ statement: "Great" });
    expect(result.success).toBe(false);
  });

  it("should reject empty paperId", () => {
    const result = createEndorsementSchema.safeParse({ paperId: "" });
    expect(result.success).toBe(false);
  });

  it("should reject statement over 2000 characters", () => {
    const result = createEndorsementSchema.safeParse({
      paperId: "paper-1",
      statement: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("should accept statement with exactly 2000 characters (boundary)", () => {
    const result = createEndorsementSchema.safeParse({
      paperId: "paper-1",
      statement: "a".repeat(2000),
    });
    expect(result.success).toBe(true);
  });
});
