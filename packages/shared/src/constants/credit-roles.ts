/**
 * CRediT (Contributor Roles Taxonomy) — ANSI/NISO Z39.104-2022
 * 14 standardized roles for describing author contributions.
 */
export const CREDIT_ROLES = [
  { id: "conceptualization", label: "Conceptualization" },
  { id: "data-curation", label: "Data Curation" },
  { id: "formal-analysis", label: "Formal Analysis" },
  { id: "funding-acquisition", label: "Funding Acquisition" },
  { id: "investigation", label: "Investigation" },
  { id: "methodology", label: "Methodology" },
  { id: "project-administration", label: "Project Administration" },
  { id: "resources", label: "Resources" },
  { id: "software", label: "Software" },
  { id: "supervision", label: "Supervision" },
  { id: "validation", label: "Validation" },
  { id: "visualization", label: "Visualization" },
  { id: "writing-original-draft", label: "Writing - Original Draft" },
  { id: "writing-review-editing", label: "Writing - Review & Editing" },
] as const;

export type CreditRoleId = (typeof CREDIT_ROLES)[number]["id"];

export const CREDIT_ROLE_IDS = CREDIT_ROLES.map((r) => r.id);
