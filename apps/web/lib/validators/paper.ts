import { z } from "zod";
import { DISCIPLINES, type Discipline } from "@academia-alexandria/shared";

function getAllSlugs(disciplines: Discipline[]): Set<string> {
  const slugs = new Set<string>();
  for (const d of disciplines) {
    slugs.add(d.slug);
    if (d.children) {
      for (const slug of getAllSlugs(d.children)) {
        slugs.add(slug);
      }
    }
  }
  return slugs;
}

const VALID_SLUGS = getAllSlugs(DISCIPLINES);

// Lenient schema for saving drafts — only a title is required
export const saveDraftSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(300, "Title must be under 300 characters"),
  abstract: z
    .string()
    .max(5000, "Abstract must be under 5000 characters")
    .optional()
    .default(""),
  content: z.string().optional().default(""),
  disciplines: z
    .array(z.string().min(1).refine((s) => VALID_SLUGS.has(s), "Invalid discipline"))
    .max(3, "Maximum 3 disciplines")
    .optional()
    .default([]),
  keywords: z
    .array(z.string().min(1).max(50))
    .max(10, "Maximum 10 keywords")
    .optional()
    .default([]),
  license: z.string().max(50).optional().default(""),
  funding: z.string().max(5000).optional().default(""),
  dataAvailability: z.string().max(5000).optional().default(""),
  competingInterests: z.string().max(5000).optional().default(""),
  ethicsStatement: z.string().max(5000).optional().default(""),
  coAuthorIds: z
    .array(z.string().min(1, "Invalid co-author ID"))
    .max(20, "Maximum 20 co-authors")
    .optional()
    .default([]),
});

// Strict schema enforced at publish time
export const publishPaperSchema = z
  .object({
    title: z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(300, "Title must be under 300 characters"),
    abstract: z
      .string()
      .min(50, "Abstract must be at least 50 characters")
      .max(5000, "Abstract must be under 5000 characters"),
    content: z.string().optional().default(""),
    pdfUrl: z.string().optional().default(""),
    disciplines: z
      .array(z.string().min(1).refine((s) => VALID_SLUGS.has(s), "Invalid discipline"))
      .min(1, "Please select at least one discipline")
      .max(3, "Maximum 3 disciplines"),
    keywords: z
      .array(z.string().min(1).max(50))
      .min(1, "Add at least one keyword")
      .max(10, "Maximum 10 keywords"),
  })
  .refine((data) => data.content.length >= 100 || data.pdfUrl.length > 0, {
    message:
      "Paper must have either markdown content (at least 100 characters) or an uploaded PDF",
  });

export const updateDraftSchema = saveDraftSchema
  .omit({ coAuthorIds: true })
  .partial();

export const paperSearchSchema = z.object({
  query: z.string().optional().default(""),
  discipline: z.string().optional().default(""),
  keyword: z.string().optional().default(""),
  status: z.enum(["", "all", "SUBMITTED", "PUBLISHED", "RETRACTED"]).optional().default(""),
  dateFrom: z.string().optional().default(""),
  dateTo: z.string().optional().default(""),
  sort: z
    .enum([
      "newest",
      "oldest",
      "most-viewed",
      "most-endorsed",
      "most-reviewed",
      "relevance",
    ])
    .optional()
    .default("newest"),
  page: z.coerce.number().int().positive().optional().default(1),
});

