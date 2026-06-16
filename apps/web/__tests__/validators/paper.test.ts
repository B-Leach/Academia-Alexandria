import { describe, it, expect } from "vitest";
import {
  saveDraftSchema,
  publishPaperSchema,
  updateDraftSchema,
  paperSearchSchema,
} from "@/lib/validators/paper";

describe("saveDraftSchema", () => {
  it("should accept minimal draft with only title", () => {
    const result = saveDraftSchema.safeParse({ title: "My Draft" });
    expect(result.success).toBe(true);
  });

  it("should reject empty title", () => {
    const result = saveDraftSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("should reject title over 300 characters", () => {
    const result = saveDraftSchema.safeParse({ title: "a".repeat(301) });
    expect(result.success).toBe(false);
  });

  it("should default abstract to empty string when omitted", () => {
    const result = saveDraftSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.abstract).toBe("");
  });

  it("should reject abstract over 5000 characters", () => {
    const result = saveDraftSchema.safeParse({
      title: "Test",
      abstract: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("should default content to empty string when omitted", () => {
    const result = saveDraftSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.content).toBe("");
  });

  it("should default disciplines to empty array when omitted", () => {
    const result = saveDraftSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.disciplines).toEqual([]);
  });

  it("should reject more than 3 disciplines", () => {
    const result = saveDraftSchema.safeParse({
      title: "Test",
      disciplines: ["a", "b", "c", "d"],
    });
    expect(result.success).toBe(false);
  });

  it("should default keywords to empty array when omitted", () => {
    const result = saveDraftSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.keywords).toEqual([]);
  });

  it("should reject more than 10 keywords", () => {
    const result = saveDraftSchema.safeParse({
      title: "Test",
      keywords: Array.from({ length: 11 }, (_, i) => `kw${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("should reject keyword over 50 characters", () => {
    const result = saveDraftSchema.safeParse({
      title: "Test",
      keywords: ["a".repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  it("should default coAuthorIds to empty array when omitted", () => {
    const result = saveDraftSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.coAuthorIds).toEqual([]);
  });

  it("should reject empty co-author ID", () => {
    const result = saveDraftSchema.safeParse({
      title: "Test",
      coAuthorIds: [""],
    });
    expect(result.success).toBe(false);
  });

  it("should reject more than 20 co-author IDs", () => {
    const result = saveDraftSchema.safeParse({
      title: "Test",
      coAuthorIds: Array.from({ length: 21 }, (_, i) => `user-id-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("should accept full valid draft data with all fields", () => {
    const result = saveDraftSchema.safeParse({
      title: "My Paper Title",
      abstract: "This is a test abstract.",
      content: "Some content here.",
      disciplines: ["machine-learning", "physics"],
      keywords: ["AI", "science"],
      coAuthorIds: ["coauthor-id-1"],
    });
    expect(result.success).toBe(true);
  });
});

describe("publishPaperSchema", () => {
  const valid = {
    title: "A Valid Title Here",
    abstract: "a".repeat(50),
    content: "a".repeat(100),
    disciplines: ["machine-learning"],
    keywords: ["AI"],
  };

  it("should accept valid paper with all required fields", () => {
    expect(publishPaperSchema.safeParse(valid).success).toBe(true);
  });

  it("should reject title shorter than 5 characters", () => {
    const result = publishPaperSchema.safeParse({ ...valid, title: "Abcd" });
    expect(result.success).toBe(false);
  });

  it("should reject title over 300 characters", () => {
    const result = publishPaperSchema.safeParse({
      ...valid,
      title: "a".repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it("should accept exactly 5-char title (boundary)", () => {
    const result = publishPaperSchema.safeParse({ ...valid, title: "Abcde" });
    expect(result.success).toBe(true);
  });

  it("should reject abstract shorter than 50 characters", () => {
    const result = publishPaperSchema.safeParse({
      ...valid,
      abstract: "a".repeat(49),
    });
    expect(result.success).toBe(false);
  });

  it("should reject abstract over 5000 characters", () => {
    const result = publishPaperSchema.safeParse({
      ...valid,
      abstract: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("should accept exactly 50-char abstract (boundary)", () => {
    const result = publishPaperSchema.safeParse({
      ...valid,
      abstract: "a".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("should reject content shorter than 100 characters", () => {
    const result = publishPaperSchema.safeParse({
      ...valid,
      content: "a".repeat(99),
    });
    expect(result.success).toBe(false);
  });

  it("should accept exactly 100-char content (boundary)", () => {
    const result = publishPaperSchema.safeParse({
      ...valid,
      content: "a".repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty disciplines array", () => {
    const result = publishPaperSchema.safeParse({ ...valid, disciplines: [] });
    expect(result.success).toBe(false);
  });

  it("should reject more than 3 disciplines", () => {
    const result = publishPaperSchema.safeParse({
      ...valid,
      disciplines: ["a", "b", "c", "d"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty keywords array", () => {
    const result = publishPaperSchema.safeParse({ ...valid, keywords: [] });
    expect(result.success).toBe(false);
  });

  it("should reject more than 10 keywords", () => {
    const result = publishPaperSchema.safeParse({
      ...valid,
      keywords: Array.from({ length: 11 }, (_, i) => `kw${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateDraftSchema", () => {
  it("should accept partial update (only title)", () => {
    const result = updateDraftSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  it("should accept partial update (only abstract)", () => {
    const result = updateDraftSchema.safeParse({ abstract: "New abstract" });
    expect(result.success).toBe(true);
  });

  it("should accept empty object (all fields optional)", () => {
    const result = updateDraftSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should not include coAuthorIds field", () => {
    const result = updateDraftSchema.safeParse({
      coAuthorIds: ["test-id"],
    });
    // coAuthorIds should be stripped (omitted from schema)
    expect(result.success).toBe(true);
    if (result.success) {
      expect("coAuthorIds" in result.data).toBe(false);
    }
  });
});

describe("paperSearchSchema", () => {
  it("should accept empty search params and apply defaults", () => {
    const result = paperSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("");
      expect(result.data.discipline).toBe("");
      expect(result.data.sort).toBe("newest");
      expect(result.data.page).toBe(1);
    }
  });

  it("should accept valid search with all params", () => {
    const result = paperSearchSchema.safeParse({
      query: "machine learning",
      discipline: "physics",
      sort: "oldest",
      page: "3",
    });
    expect(result.success).toBe(true);
  });

  it("should default sort to newest", () => {
    const result = paperSearchSchema.safeParse({ sort: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sort).toBe("newest");
  });

  it("should reject invalid sort value", () => {
    const result = paperSearchSchema.safeParse({ sort: "invalid" });
    expect(result.success).toBe(false);
  });

  it("should coerce page string to number", () => {
    const result = paperSearchSchema.safeParse({ page: "5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(5);
  });

  it("should reject page 0 or negative", () => {
    expect(paperSearchSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(paperSearchSchema.safeParse({ page: "-1" }).success).toBe(false);
  });

  it("should default page to 1 when omitted", () => {
    const result = paperSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(1);
  });

  it("should accept keyword parameter", () => {
    const result = paperSearchSchema.safeParse({ keyword: "NER" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.keyword).toBe("NER");
  });

  it("should default keyword to empty string", () => {
    const result = paperSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.keyword).toBe("");
  });

  it("should accept relevance sort", () => {
    const result = paperSearchSchema.safeParse({ sort: "relevance" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sort).toBe("relevance");
  });

  it("should accept most-endorsed sort", () => {
    const result = paperSearchSchema.safeParse({ sort: "most-endorsed" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sort).toBe("most-endorsed");
  });

  it("should accept most-reviewed sort", () => {
    const result = paperSearchSchema.safeParse({ sort: "most-reviewed" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sort).toBe("most-reviewed");
  });
});
