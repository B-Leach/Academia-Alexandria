import { db } from "@/lib/db";

const SIMILARITY_THRESHOLD = 0.7;
const AUTO_REPORT_THRESHOLD = 0.8;

/**
 * Check a paper's abstract against all other submitted/published papers
 * using PostgreSQL pg_trgm trigram similarity. Updates the paper's
 * similarityScore and similarityPaperId fields. If the score exceeds
 * the auto-report threshold, creates a report for moderator review.
 */
export async function checkInternalSimilarity(
  paperId: string,
): Promise<void> {
  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { abstract: true, content: true, authors: { select: { userId: true } } },
  });

  if (!paper) return;

  // Use abstract for comparison (always present, consistent length)
  const textToCompare = paper.abstract;
  if (!textToCompare || textToCompare.length < 50) return;

  // Find the most similar paper using pg_trgm
  const results = await db.$queryRaw<
    Array<{ id: string; score: number }>
  >`
    SELECT id, similarity(abstract, ${textToCompare}) AS score
    FROM papers
    WHERE id != ${paperId}
      AND status IN ('SUBMITTED', 'PUBLISHED')
      AND length(abstract) > 50
      AND similarity(abstract, ${textToCompare}) > ${SIMILARITY_THRESHOLD}
    ORDER BY score DESC
    LIMIT 1
  `;

  if (results.length === 0) {
    await db.paper.update({
      where: { id: paperId },
      data: { similarityScore: 0, similarityPaperId: null },
    });
    return;
  }

  const match = results[0];
  await db.paper.update({
    where: { id: paperId },
    data: {
      similarityScore: match.score,
      similarityPaperId: match.id,
    },
  });

  // Auto-create a report if similarity is very high
  if (match.score >= AUTO_REPORT_THRESHOLD) {
    // Use the matched paper's first author as reporter (they're the affected party)
    const matchedPaper = await db.paper.findUnique({
      where: { id: match.id },
      select: { authors: { select: { userId: true }, take: 1 } },
    });
    const reporterId = matchedPaper?.authors[0]?.userId;
    if (!reporterId) return;

    await db.report.create({
      data: {
        reporterId,
        targetType: "PAPER",
        targetId: paperId,
        reason: `Automated similarity check: ${Math.round(match.score * 100)}% match with paper ${match.id}. This report was generated automatically and requires moderator review.`,
      },
    });
  }
}
