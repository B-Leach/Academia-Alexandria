import { describe, it, expect } from "vitest";
import {
  formatBibtex,
  formatApa,
  formatMla,
  formatChicago,
  formatRis,
  formatCslJson,
  formatCitation,
  type CitationData,
} from "@/lib/citations";

const basePaper: CitationData = {
  id: "clm8abc12345",
  title: "A Study of Quantum Computing",
  authors: [
    { name: "Jane A. Smith", institution: "MIT" },
    { name: "Robert Doe", institution: "Stanford" },
  ],
  abstract: "This paper studies quantum computing advances.",
  keywords: ["quantum", "computing"],
  doi: "10.1234/example.2024",
  publishedAt: new Date("2024-03-15T12:00:00Z"),
  version: 1,
  url: "https://academiaalexandria.org/papers/clm8abc12345",
};

describe("formatBibtex", () => {
  it("should generate valid @article structure", () => {
    const result = formatBibtex(basePaper);
    expect(result).toMatch(/^@article\{smith2024_clm8abc1,/);
    expect(result).toContain("title     = {A Study of Quantum Computing}");
    expect(result).toContain("author    = {Smith, Jane A. and Doe, Robert}");
    expect(result).toContain("journal   = {Academia Alexandria}");
    expect(result).toContain("year      = {2024}");
    expect(result).toContain("month     = {mar}");
    expect(result).toContain("doi       = {10.1234/example.2024}");
    expect(result).toContain(
      "url       = {https://academiaalexandria.org/papers/clm8abc12345}",
    );
    expect(result).toContain("keywords  = {quantum, computing}");
    expect(result).toContain(
      "abstract  = {This paper studies quantum computing advances.}",
    );
    expect(result).toMatch(/\n\}$/);
  });

  it("should escape LaTeX special characters", () => {
    const paper: CitationData = {
      ...basePaper,
      title: "Cost & Benefits: A 100% Study of $10 Items",
    };
    const result = formatBibtex(paper);
    expect(result).toContain(
      "Cost \\& Benefits: A 100\\% Study of \\$10 Items",
    );
  });

  it("should omit doi field when null", () => {
    const paper: CitationData = { ...basePaper, doi: null };
    const result = formatBibtex(paper);
    expect(result).not.toContain("doi");
  });

  it("should omit month when date is missing", () => {
    const paper: CitationData = { ...basePaper, publishedAt: null };
    const result = formatBibtex(paper);
    expect(result).not.toContain("month");
    expect(result).toContain("year      = {}");
  });

  it("should include version note when pinnedVersion is set", () => {
    const paper: CitationData = { ...basePaper, pinnedVersion: 3 };
    const result = formatBibtex(paper);
    expect(result).toContain("note      = {Version 3}");
  });

  it("should omit version note when version is 1", () => {
    const result = formatBibtex(basePaper);
    expect(result).not.toContain("note");
  });

  it("should handle single author", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Alice Johnson" }],
    };
    const result = formatBibtex(paper);
    expect(result).toContain("author    = {Johnson, Alice}");
    expect(result).not.toContain(" and ");
  });

  it("should handle empty keywords", () => {
    const paper: CitationData = { ...basePaper, keywords: [] };
    const result = formatBibtex(paper);
    expect(result).not.toContain("keywords");
  });

  it("should handle mononymous author", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Aristotle" }],
    };
    const result = formatBibtex(paper);
    expect(result).toContain("author    = {Aristotle}");
  });

  it("should handle names without honorifics (honorifics are stored separately)", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Ibrahim Yilmaz" }],
    };
    const result = formatBibtex(paper);
    expect(result).toContain("author    = {Yilmaz, Ibrahim}");
  });
});

describe("formatApa", () => {
  it("should format two authors correctly", () => {
    const result = formatApa(basePaper);
    expect(result).toBe(
      "Smith, J. A., & Doe, R. (2024). A Study of Quantum Computing. Academia Alexandria. https://doi.org/10.1234/example.2024",
    );
  });

  it("should format single author", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Jane A. Smith" }],
    };
    const result = formatApa(paper);
    expect(result.startsWith("Smith, J. A. (2024).")).toBe(true);
  });

  it("should format three+ authors with commas and ampersand", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [
        { name: "Jane Smith" },
        { name: "Robert Doe" },
        { name: "Alice Johnson" },
      ],
    };
    const result = formatApa(paper);
    expect(result.startsWith("Smith, J., Doe, R., & Johnson, A. (2024).")).toBe(
      true,
    );
  });

  it("should use (n.d.) when date is missing", () => {
    const paper: CitationData = { ...basePaper, publishedAt: null };
    const result = formatApa(paper);
    expect(result).toContain("(n.d.)");
  });

  it("should use paper URL when doi is null", () => {
    const paper: CitationData = { ...basePaper, doi: null };
    const result = formatApa(paper);
    expect(result).toContain(
      "https://academiaalexandria.org/papers/clm8abc12345",
    );
    expect(result).not.toContain("doi.org");
  });

  it("should format names without honorifics (honorifics stored separately)", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Ibrahim Yilmaz" }],
    };
    const result = formatApa(paper);
    expect(result.startsWith("Yilmaz, I. (2024).")).toBe(true);
  });
});

describe("formatMla", () => {
  it("should format two authors correctly", () => {
    const result = formatMla(basePaper);
    expect(result).toBe(
      'Smith, Jane A., and Robert Doe. "A Study of Quantum Computing." Academia Alexandria, 2024, https://doi.org/10.1234/example.2024.',
    );
  });

  it("should format single author with Last, First", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Jane A. Smith" }],
    };
    const result = formatMla(paper);
    expect(
      result.startsWith('Smith, Jane A. "A Study of Quantum Computing."'),
    ).toBe(true);
  });

  it("should use et al. for 3+ authors", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [
        { name: "Jane Smith" },
        { name: "Robert Doe" },
        { name: "Alice Johnson" },
      ],
    };
    const result = formatMla(paper);
    expect(result.startsWith("Smith, Jane, et al.")).toBe(true);
  });

  it("should omit year when date is missing", () => {
    const paper: CitationData = { ...basePaper, publishedAt: null };
    const result = formatMla(paper);
    // Should not have ", n.d.," but instead just skip the year
    expect(result).not.toContain("n.d.");
    expect(result).toContain('" Academia Alexandria, https://');
  });
});

describe("formatChicago", () => {
  it("should format with full date", () => {
    const result = formatChicago(basePaper);
    expect(result).toBe(
      'Smith, Jane A., and Robert Doe. "A Study of Quantum Computing." Academia Alexandria, March 15, 2024. https://doi.org/10.1234/example.2024.',
    );
  });

  it("should format single author", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Jane Smith" }],
    };
    const result = formatChicago(paper);
    expect(
      result.startsWith('Smith, Jane. "A Study of Quantum Computing."'),
    ).toBe(true);
  });

  it("should show n.d. when date is missing", () => {
    const paper: CitationData = { ...basePaper, publishedAt: null };
    const result = formatChicago(paper);
    expect(result).toContain("Academia Alexandria, n.d.");
  });

  it("should list all authors for 3+ authors", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [
        { name: "Jane Smith" },
        { name: "Robert Doe" },
        { name: "Alice Johnson" },
      ],
    };
    const result = formatChicago(paper);
    expect(
      result.startsWith("Smith, Jane, Robert Doe, and Alice Johnson."),
    ).toBe(true);
  });
});

describe("formatRis", () => {
  it("should generate valid RIS with all tags", () => {
    const result = formatRis(basePaper);
    expect(result).toContain("TY  - JOUR");
    expect(result).toContain("TI  - A Study of Quantum Computing");
    expect(result).toContain("AU  - Smith, Jane A.");
    expect(result).toContain("AU  - Doe, Robert");
    expect(result).toContain("PY  - 2024/03/15/");
    expect(result).toContain("DA  - 2024/03/15/");
    expect(result).toContain(
      "AB  - This paper studies quantum computing advances.",
    );
    expect(result).toContain("JO  - Academia Alexandria");
    expect(result).toContain("PB  - Academia Alexandria");
    expect(result).toContain("DO  - 10.1234/example.2024");
    expect(result).toContain(
      "UR  - https://academiaalexandria.org/papers/clm8abc12345",
    );
    expect(result).toContain("KW  - quantum");
    expect(result).toContain("KW  - computing");
    expect(result).toContain("ER  - ");
  });

  it("should use CRLF line endings", () => {
    const result = formatRis(basePaper);
    expect(result).toContain("\r\n");
  });

  it("should omit date tags when date is missing", () => {
    const paper: CitationData = { ...basePaper, publishedAt: null };
    const result = formatRis(paper);
    expect(result).not.toContain("PY  -");
    expect(result).not.toContain("DA  -");
  });

  it("should omit DOI tag when doi is null", () => {
    const paper: CitationData = { ...basePaper, doi: null };
    const result = formatRis(paper);
    expect(result).not.toContain("DO  -");
  });

  it("should handle mononymous author", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Aristotle" }],
    };
    const result = formatRis(paper);
    expect(result).toContain("AU  - Aristotle");
  });

  it("should include version note when pinnedVersion is set", () => {
    const paper: CitationData = { ...basePaper, pinnedVersion: 2 };
    const result = formatRis(paper);
    expect(result).toContain("N1  - Version 2");
    expect(result).toContain("?v=2");
  });

  it("should omit version note when not pinned", () => {
    const result = formatRis(basePaper);
    expect(result).not.toContain("N1  -");
  });
});

describe("formatCslJson", () => {
  it("should generate valid CSL-JSON structure", () => {
    const result = formatCslJson(basePaper);
    const csl = JSON.parse(result);
    expect(csl.type).toBe("article-journal");
    expect(csl.id).toBe("clm8abc12345");
    expect(csl.title).toBe("A Study of Quantum Computing");
    expect(csl["container-title"]).toBe("Academia Alexandria");
    expect(csl.publisher).toBe("Academia Alexandria");
    expect(csl.URL).toBe("https://academiaalexandria.org/papers/clm8abc12345");
    expect(csl.abstract).toBe("This paper studies quantum computing advances.");
  });

  it("should split author names into family and given", () => {
    const result = formatCslJson(basePaper);
    const csl = JSON.parse(result);
    expect(csl.author).toEqual([
      { family: "Smith", given: "Jane A." },
      { family: "Doe", given: "Robert" },
    ]);
  });

  it("should handle mononymous author with family only", () => {
    const paper: CitationData = {
      ...basePaper,
      authors: [{ name: "Aristotle" }],
    };
    const result = formatCslJson(paper);
    const csl = JSON.parse(result);
    expect(csl.author).toEqual([{ family: "Aristotle" }]);
  });

  it("should format issued date as date-parts", () => {
    const result = formatCslJson(basePaper);
    const csl = JSON.parse(result);
    expect(csl.issued).toEqual({
      "date-parts": [[2024, 3, 15]],
    });
  });

  it("should omit issued when date is missing", () => {
    const paper: CitationData = { ...basePaper, publishedAt: null };
    const result = formatCslJson(paper);
    const csl = JSON.parse(result);
    expect(csl.issued).toBeUndefined();
  });

  it("should include DOI when present", () => {
    const result = formatCslJson(basePaper);
    const csl = JSON.parse(result);
    expect(csl.DOI).toBe("10.1234/example.2024");
  });

  it("should omit DOI when null", () => {
    const paper: CitationData = { ...basePaper, doi: null };
    const result = formatCslJson(paper);
    const csl = JSON.parse(result);
    expect(csl.DOI).toBeUndefined();
  });

  it("should include keywords as comma-separated string", () => {
    const result = formatCslJson(basePaper);
    const csl = JSON.parse(result);
    expect(csl.keyword).toBe("quantum, computing");
  });

  it("should omit keyword when keywords array is empty", () => {
    const paper: CitationData = { ...basePaper, keywords: [] };
    const result = formatCslJson(paper);
    const csl = JSON.parse(result);
    expect(csl.keyword).toBeUndefined();
  });

  it("should include version and note when pinnedVersion is set", () => {
    const paper: CitationData = { ...basePaper, pinnedVersion: 3 };
    const result = formatCslJson(paper);
    const csl = JSON.parse(result);
    expect(csl.version).toBe("3");
    expect(csl.note).toBe("Version 3");
    expect(csl.URL).toContain("?v=3");
  });

  it("should produce valid JSON output", () => {
    const result = formatCslJson(basePaper);
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

describe("formatCitation dispatcher", () => {
  it("should return bibtex format", () => {
    expect(formatCitation(basePaper, "bibtex")).toBe(formatBibtex(basePaper));
  });

  it("should return apa format", () => {
    expect(formatCitation(basePaper, "apa")).toBe(formatApa(basePaper));
  });

  it("should return mla format", () => {
    expect(formatCitation(basePaper, "mla")).toBe(formatMla(basePaper));
  });

  it("should return chicago format", () => {
    expect(formatCitation(basePaper, "chicago")).toBe(formatChicago(basePaper));
  });

  it("should return ris format", () => {
    expect(formatCitation(basePaper, "ris")).toBe(formatRis(basePaper));
  });

  it("should return csl-json format", () => {
    expect(formatCitation(basePaper, "csl-json")).toBe(
      formatCslJson(basePaper),
    );
  });
});
