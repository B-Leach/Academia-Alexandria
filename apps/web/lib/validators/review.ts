import { z } from "zod";

export const createReviewSchema = z.object({
  paperId: z.string().min(1),
  methodologyScore: z.coerce.number().int().min(1).max(10),
  noveltyScore: z.coerce.number().int().min(1).max(10),
  clarityScore: z.coerce.number().int().min(1).max(10),
  reproducibilityScore: z.coerce.number().int().min(1).max(10),
  ethicsScore: z.coerce.number().int().min(1).max(10),
  summary: z
    .string()
    .min(100, "Summary must be at least 100 characters")
    .max(5000, "Summary must be under 5,000 characters"),
  strengthsText: z
    .string()
    .min(100, "Strengths must be at least 100 characters")
    .max(5000, "Strengths must be under 5,000 characters"),
  weaknessesText: z
    .string()
    .min(100, "Weaknesses must be at least 100 characters")
    .max(5000, "Weaknesses must be under 5,000 characters"),
  detailedComments: z
    .string()
    .max(10000, "Detailed comments must be under 10,000 characters")
    .optional()
    .default(""),
  recommendation: z.enum(["SOUND", "NEEDS_REVISION", "UNSOUND"]),
  confidenceLevel: z.coerce.number().int().min(1).max(5),
  conflictOfInterest: z
    .string()
    .max(2000, "Conflict of interest statement must be under 2,000 characters")
    .optional()
    .default(""),
  isAnonymous: z
    .union([
      z.boolean(),
      z.string().transform((v) => v === "true" || v === "on"),
    ])
    .optional()
    .default(false),
});

