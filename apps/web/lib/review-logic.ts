/**
 * Determine if a review qualifies toward the publication threshold.
 * A review qualifies if the reviewer's research areas overlap with the
 * paper's disciplines. Confidence level is recorded as metadata but does
 * not affect qualification — only demonstrated expertise counts.
 */
export function isQualifyingReview(
  _confidenceLevel: number,
  reviewerSlugs: string[],
  paperDisciplines: string[],
): boolean {
  return paperDisciplines.some((d) => reviewerSlugs.includes(d));
}
