import { describe, it, expect } from "vitest";
import { flattenDisciplines } from "../disciplines";

describe("flattenDisciplines", () => {
  const flat = flattenDisciplines();

  it("should return a non-empty array", () => {
    expect(flat.length).toBeGreaterThan(0);
  });

  it("should include top-level categories", () => {
    const slugs = flat.map((d) => d.slug);
    // Check a few known top-level categories
    expect(slugs).toContain("computer-science");
    expect(slugs).toContain("engineering");
  });

  it("should include child disciplines", () => {
    const slugs = flat.map((d) => d.slug);
    // Check some known child disciplines
    expect(slugs).toContain("machine-learning");
    expect(slugs).toContain("interdisciplinary-studies");
  });

  it("should not include children property in flattened output", () => {
    for (const item of flat) {
      expect(item).not.toHaveProperty("children");
    }
  });

  it("should return items with name and slug", () => {
    for (const item of flat) {
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("slug");
      expect(typeof item.name).toBe("string");
      expect(typeof item.slug).toBe("string");
    }
  });
});
