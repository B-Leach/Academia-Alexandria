export const REVIEW_RUBRIC = {
  methodology: {
    label: "Methodology",
    description:
      "Rigor and appropriateness of the research methods, experimental design, and analytical approach.",
    min: 1,
    max: 10,
  },
  novelty: {
    label: "Novelty",
    description:
      "Originality of the contribution and its advancement beyond existing work in the field.",
    min: 1,
    max: 10,
  },
  clarity: {
    label: "Clarity",
    description:
      "Quality of writing, logical structure, and presentation of ideas and results.",
    min: 1,
    max: 10,
  },
  reproducibility: {
    label: "Reproducibility",
    description:
      "Sufficiency of detail, data, and materials provided to reproduce the results.",
    min: 1,
    max: 10,
  },
  ethics: {
    label: "Ethical Considerations",
    description:
      "Adequate handling of ethical issues, conflicts of interest, and responsible research practices.",
    min: 1,
    max: 10,
  },
} as const;

export type RubricDimension = keyof typeof REVIEW_RUBRIC;

export const REVIEW_RECOMMENDATIONS = [
  { value: "SOUND", label: "Sound", color: "green" },
  { value: "NEEDS_REVISION", label: "Needs Revision", color: "yellow" },
  { value: "UNSOUND", label: "Unsound", color: "red" },
] as const;

export const CONFIDENCE_LEVELS = [
  { value: 1, label: "Very Low", description: "Not in my area of expertise" },
  {
    value: 2,
    label: "Low",
    description: "Some familiarity with the topic",
  },
  {
    value: 3,
    label: "Medium",
    description: "Knowledgeable in the area",
  },
  {
    value: 4,
    label: "High",
    description: "Expert in the specific topic",
  },
  {
    value: 5,
    label: "Very High",
    description: "Leading expert in this exact area",
  },
] as const;
