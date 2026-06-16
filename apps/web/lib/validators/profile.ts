import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  honorific: z
    .string()
    .max(20, "Honorific must be under 20 characters")
    .optional()
    .default(""),
  bio: z
    .string()
    .max(2000, "Bio must be under 2000 characters")
    .optional()
    .default(""),
  institution: z
    .string()
    .max(200, "Institution must be under 200 characters")
    .optional()
    .default(""),
  rorId: z
    .string()
    .max(50, "ROR ID must be under 50 characters")
    .optional()
    .default(""),
  researchAreaIds: z
    .array(z.string())
    .max(10, "Maximum 10 research areas")
    .optional()
    .default([]),
});
