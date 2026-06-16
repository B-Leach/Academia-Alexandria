import { z } from "zod";

export const createEndorsementSchema = z.object({
  paperId: z.string().min(1),
  statement: z
    .string()
    .max(2000, "Statement must be under 2,000 characters")
    .optional()
    .default(""),
  conflictOfInterest: z
    .string()
    .max(2000, "Conflict of interest statement must be under 2,000 characters")
    .optional()
    .default(""),
});
