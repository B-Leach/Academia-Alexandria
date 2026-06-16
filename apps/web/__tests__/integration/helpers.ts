import { db } from "@/lib/db";
import { mockAuthFn, mockSignIn, mockSignOut } from "./setup";
import bcrypt from "bcryptjs";

// -----------------------------------------------------------------------
// Database cleanup
// -----------------------------------------------------------------------

/**
 * Truncate all data tables, preserving research_areas (seeded once).
 * Uses CASCADE to handle foreign key relationships.
 */
export async function cleanDatabase() {
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_logs,
      webhooks,
      api_keys,
      "references",
      reputation_events,
      endorsements,
      reviews,
      comments,
      bounty_payouts,
      bounties,
      paper_authors,
      paper_research_areas,
      papers,
      user_research_areas,
      sessions,
      accounts,
      users
    CASCADE
  `);
}

// -----------------------------------------------------------------------
// Auth helpers
// -----------------------------------------------------------------------

export function setAuthenticatedAs(user: {
  id: string;
  name: string;
  email: string;
  emailVerified?: Date | null;
  banned?: boolean;
}) {
  mockAuthFn.mockResolvedValue({
    user: {
      emailVerified: user.emailVerified ?? new Date(),
      banned: user.banned ?? false,
      ...user,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

export function setUnauthenticated() {
  mockAuthFn.mockResolvedValue(null);
}

export { mockAuthFn, mockSignIn, mockSignOut };

// -----------------------------------------------------------------------
// Factory: Test User
// -----------------------------------------------------------------------

let userCounter = 0;

export async function createTestUser(
  overrides: {
    name?: string;
    email?: string;
    reputationScore?: number;
    password?: string;
    emailVerified?: Date | null;
    orcidId?: string | null;
  } = {},
) {
  userCounter++;
  const name = overrides.name ?? `Test User ${userCounter}`;
  const email = overrides.email ?? `testuser${userCounter}@example.com`;
  const password = overrides.password ?? "TestPass1";
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed

  return db.user.create({
    data: {
      name,
      email,
      passwordHash,
      reputationScore: overrides.reputationScore ?? 0,
      orcidId: overrides.orcidId !== undefined ? overrides.orcidId : `0000-0000-0000-${String(userCounter).padStart(4, "0")}`,
      emailVerified:
        overrides.emailVerified !== undefined
          ? overrides.emailVerified
          : new Date(),
    },
  });
}

// -----------------------------------------------------------------------
// Factory: Test Paper (DRAFT by default, with enough content to submit)
// -----------------------------------------------------------------------

export async function createTestPaper(
  authorId: string,
  overrides: {
    title?: string;
    abstract?: string;
    content?: string;
    disciplines?: string[];
    keywords?: string[];
    coAuthorIds?: string[];
  } = {},
) {
  const paper = await db.paper.create({
    data: {
      title:
        overrides.title ??
        "A Comprehensive Study of Integration Testing Patterns",
      abstract:
        overrides.abstract ??
        "This paper explores modern integration testing strategies for full-stack web applications using real database connections.",
      content:
        overrides.content ??
        "Integration testing is a critical phase in software development. This paper examines patterns for testing server actions against real PostgreSQL databases with Prisma ORM. We demonstrate how to maintain test isolation while verifying real transaction behavior and constraint enforcement.",
      disciplines: overrides.disciplines ?? ["computer-science"],
      keywords: overrides.keywords ?? ["testing", "integration"],
      authors: {
        create: [
          { userId: authorId, order: 0, isCorresponding: true },
          ...(overrides.coAuthorIds ?? []).map((id, i) => ({
            userId: id,
            order: i + 1,
            isCorresponding: false,
          })),
        ],
      },
    },
  });

  return paper;
}

// -----------------------------------------------------------------------
// Helper: Add research areas to a user (for qualifying review tests)
// -----------------------------------------------------------------------

export async function addResearchAreas(userId: string, slugs: string[]) {
  for (const slug of slugs) {
    const area = await db.researchArea.findUnique({ where: { slug } });
    if (!area)
      throw new Error(`Research area '${slug}' not found in seed data`);
    await db.userResearchArea.create({
      data: { userId, researchAreaId: area.id },
    });
  }
}

// -----------------------------------------------------------------------
// Helpers: Paper status shortcuts
// -----------------------------------------------------------------------

export async function submitTestPaper(paperId: string) {
  return db.paper.update({
    where: { id: paperId },
    data: { status: "SUBMITTED", publishedAt: new Date() },
  });
}

export async function publishTestPaper(paperId: string) {
  return db.paper.update({
    where: { id: paperId },
    data: { status: "PUBLISHED" },
  });
}

/** Set acceptanceEligibleAt far enough in the past to skip the cool-off period. */
export async function skipCooloff(paperId: string) {
  return db.paper.update({
    where: { id: paperId },
    data: {
      acceptanceEligibleAt: new Date(Date.now() - 121 * 60 * 60 * 1000),
    },
  });
}

// -----------------------------------------------------------------------
// Factory: Review FormData
// -----------------------------------------------------------------------

export function buildReviewFormData(
  paperId: string,
  overrides: {
    methodologyScore?: string;
    noveltyScore?: string;
    clarityScore?: string;
    reproducibilityScore?: string;
    ethicsScore?: string;
    summary?: string;
    strengthsText?: string;
    weaknessesText?: string;
    detailedComments?: string;
    recommendation?: string;
    confidenceLevel?: string;
  } = {},
) {
  const fd = new FormData();
  fd.set("paperId", paperId);
  fd.set("methodologyScore", overrides.methodologyScore ?? "7");
  fd.set("noveltyScore", overrides.noveltyScore ?? "7");
  fd.set("clarityScore", overrides.clarityScore ?? "7");
  fd.set("reproducibilityScore", overrides.reproducibilityScore ?? "7");
  fd.set("ethicsScore", overrides.ethicsScore ?? "7");
  fd.set(
    "summary",
    overrides.summary ??
      "This is a well-structured paper that makes meaningful contributions to the field of study. The authors present a clear and compelling argument supported by evidence.",
  );
  fd.set(
    "strengthsText",
    overrides.strengthsText ??
      "Strong methodology, clear writing, and novel approach to the problem at hand. The experimental design is thorough and the statistical analysis is appropriate.",
  );
  fd.set(
    "weaknessesText",
    overrides.weaknessesText ??
      "Some minor issues with reproducibility and a few areas could use more detail. The literature review could be expanded to better contextualize the findings.",
  );
  fd.set("detailedComments", overrides.detailedComments ?? "");
  fd.set("recommendation", overrides.recommendation ?? "SOUND");
  fd.set("confidenceLevel", overrides.confidenceLevel ?? "4");
  return fd;
}

// -----------------------------------------------------------------------
// Re-export buildFormData
// -----------------------------------------------------------------------

export { buildFormData } from "../helpers/form-data";

// -----------------------------------------------------------------------
// Reset counter between suites
// -----------------------------------------------------------------------

export function resetCounters() {
  userCounter = 0;
}
