import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import {
  setAuthenticated,
  setUnauthenticated,
  setUnverified,
  setNoOrcid,
} from "../helpers/mock-auth";
import { buildFormData } from "../helpers/form-data";
import { revalidatePath } from "next/cache";

// Mock tryAcceptPaper so it doesn't execute real logic
vi.mock("@/lib/paper-acceptance", () => ({
  tryAcceptPaper: vi.fn(),
}));

// Mock bounty payout so it doesn't try to use Stripe
vi.mock("@/lib/bounty-payout", () => ({
  processBountyPayout: vi.fn(),
}));

import {
  createReview,
  editReview,
  deleteReview,
  getReviews,
} from "@/actions/review";
import { tryAcceptPaper } from "@/lib/paper-acceptance";
import { REPUTATION_POINTS } from "@academia-alexandria/shared";

beforeEach(() => {
  setAuthenticated();
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(tryAcceptPaper).mockReset();
});

const validForm = () =>
  buildFormData({
    paperId: "paper-1",
    methodologyScore: "7",
    noveltyScore: "6",
    clarityScore: "8",
    reproducibilityScore: "5",
    ethicsScore: "9",
    summary:
      "This is a solid and comprehensive summary of the review that covers the key findings, methodology, and contributions to the broader field of study.",
    strengthsText:
      "The methodology is well designed and rigorous, with a clear experimental setup, proper controls, and appropriate statistical analysis throughout the study.",
    weaknessesText:
      "The sample size could be larger for statistical significance and the literature review could be more comprehensive to better situate the work in context.",
    detailedComments: "",
    recommendation: "SOUND",
    confidenceLevel: "3",
  });

const paperFixture = {
  id: "paper-1",
  status: "SUBMITTED",
  disciplines: ["machine-learning"],
  authors: [{ userId: "author-1" }],
};

describe("createReview", () => {
  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await createReview(validForm());
    expect(result.error).toContain("signed in");
  });

  it("should return error when email is not verified", async () => {
    setAuthenticated();
    setUnverified();
    const result = await createReview(validForm());
    expect(result.error).toContain("verify your email");
  });

  it("should return error when ORCID is not linked", async () => {
    setAuthenticated();
    setNoOrcid();
    const result = await createReview(validForm());
    expect(result.error).toContain("ORCID");
  });

  it("should return error for invalid form data", async () => {
    const fd = buildFormData({ paperId: "p1", summary: "Short" });
    const result = await createReview(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error when paper not found", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(null);
    const result = await createReview(validForm());
    expect(result.error).toContain("not found");
  });

  it("should return error when paper is DRAFT", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      ...paperFixture,
      status: "DRAFT",
    } as any);
    const result = await createReview(validForm());
    expect(result.error).toContain("not found or not available");
  });

  it("should return error when paper is RETRACTED", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      ...paperFixture,
      status: "RETRACTED",
    } as any);
    const result = await createReview(validForm());
    expect(result.error).toContain("not found or not available");
  });

  it("should return error when user is an author of the paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      ...paperFixture,
      authors: [{ userId: "user-1" }], // same as default session user
    } as any);
    const result = await createReview(validForm());
    expect(result.error).toContain("cannot review your own");
  });

  it("should return error when user has already reviewed the paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue({ id: "existing" } as any);
    const result = await createReview(validForm());
    expect(result.error).toContain("already reviewed");
  });

  it("should allow review on bounty paper without Stripe Connect (pending payout)", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      ...paperFixture,
      bounty: { status: "ACTIVE" },
    } as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "r1" } as any);
    const result = await createReview(validForm());
    expect(result.success).toBe(true);
  });

  it("should create review successfully", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const result = await createReview(validForm());
    expect(result.success).toBe(true);
  });

  it("should increment paper reviewCount", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await createReview(validForm());
    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reviewCount: { increment: 1 } },
      }),
    );
  });

  it("should NOT award reputation for high confidence without discipline overlap", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([]); // No overlap
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    // High confidence but no discipline overlap — should NOT qualify
    const fd = validForm();
    fd.set("confidenceLevel", "5");
    await createReview(fd);

    expect(prismaMock.reputationEvent.create).not.toHaveBeenCalled();
  });

  it("should award reputation for qualifying review (discipline overlap)", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([
      { researchArea: { slug: "machine-learning" } },
    ] as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    // Use confidence 1 (low) but matching discipline
    const fd = validForm();
    fd.set("confidenceLevel", "1");
    await createReview(fd);

    expect(prismaMock.reputationEvent.create).toHaveBeenCalled();
  });

  it("should NOT award reputation for non-qualifying review", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([
      { researchArea: { slug: "biology" } }, // No overlap with machine-learning
    ] as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    // Low confidence + no discipline match
    const fd = validForm();
    fd.set("confidenceLevel", "1");
    await createReview(fd);

    expect(prismaMock.reputationEvent.create).not.toHaveBeenCalled();
  });

  it("should call tryAcceptPaper when paper status is SUBMITTED", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createReview(validForm());
    expect(tryAcceptPaper).toHaveBeenCalledWith("paper-1");
  });

  it("should NOT call tryAcceptPaper when paper status is PUBLISHED", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      ...paperFixture,
      status: "PUBLISHED",
    } as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createReview(validForm());
    expect(tryAcceptPaper).not.toHaveBeenCalled();
  });

  it("should call revalidatePath for the paper", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createReview(validForm());
    expect(revalidatePath).toHaveBeenCalledWith("/papers/paper-1");
  });

  it("should persist isAnonymous flag when submitting anonymously", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.review.findUnique.mockResolvedValue(null);
    prismaMock.userResearchArea.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.create.mockResolvedValue({ id: "review-1" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const fd = validForm();
    fd.set("isAnonymous", "true");
    await createReview(fd);

    expect(prismaMock.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isAnonymous: true }),
      }),
    );
  });
});

// -----------------------------------------------------------------------
// editReview
// -----------------------------------------------------------------------
describe("editReview", () => {
  const editForm = () =>
    buildFormData({
      methodologyScore: "8",
      noveltyScore: "7",
      clarityScore: "9",
      reproducibilityScore: "6",
      ethicsScore: "10",
      summary:
        "Updated summary of the review content with more detailed analysis of the methodology, findings, and overall contributions to the research community.",
      strengthsText:
        "The methodology is excellent and well designed with robust statistical approaches, thorough experimental controls, and clear documentation of procedures.",
      weaknessesText:
        "Still needs larger sample sizes for statistical significance and a broader discussion of limitations and potential confounding variables in the study.",
      detailedComments: "",
      recommendation: "SOUND",
      confidenceLevel: "4",
    });

  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await editReview("review-1", editForm());
    expect(result.error).toContain("signed in");
  });

  it("should return error when review not found", async () => {
    prismaMock.review.findUnique.mockResolvedValue(null);
    const result = await editReview("review-1", editForm());
    expect(result.error).toContain("not found");
  });

  it("should return error when user is not the reviewer", async () => {
    prismaMock.review.findUnique.mockResolvedValue({
      reviewerId: "other-user",
      paperId: "paper-1",
      recommendation: "SOUND",
      paper: { status: "SUBMITTED", acceptanceEligibleAt: null },
    } as any);
    const result = await editReview("review-1", editForm());
    expect(result.error).toContain("only edit your own");
  });

  it("should return error when paper is PUBLISHED", async () => {
    prismaMock.review.findUnique.mockResolvedValue({
      reviewerId: "user-1",
      paperId: "paper-1",
      recommendation: "SOUND",
      paper: { status: "PUBLISHED", acceptanceEligibleAt: null },
    } as any);
    const result = await editReview("review-1", editForm());
    expect(result.error).toContain("published");
  });

  it("should update review when paper is SUBMITTED", async () => {
    prismaMock.review.findUnique.mockResolvedValue({
      reviewerId: "user-1",
      paperId: "paper-1",
      recommendation: "SOUND",
      paper: { status: "SUBMITTED", acceptanceEligibleAt: null },
    } as any);
    prismaMock.review.update.mockResolvedValue({} as any);

    const result = await editReview("review-1", editForm());
    expect(result.success).toBe(true);
    expect(prismaMock.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "review-1" },
        data: expect.objectContaining({
          summary:
            "Updated summary of the review content with more detailed analysis of the methodology, findings, and overall contributions to the research community.",
          editedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("should call tryAcceptPaper after editing when paper is SUBMITTED", async () => {
    prismaMock.review.findUnique.mockResolvedValue({
      reviewerId: "user-1",
      paperId: "paper-1",
      recommendation: "SOUND",
      paper: { status: "SUBMITTED", acceptanceEligibleAt: null },
    } as any);
    prismaMock.review.update.mockResolvedValue({} as any);

    await editReview("review-1", editForm());
    expect(tryAcceptPaper).toHaveBeenCalledWith("paper-1");
  });

  it("should reset acceptanceEligibleAt when recommendation changes during cool-off", async () => {
    prismaMock.review.findUnique.mockResolvedValue({
      reviewerId: "user-1",
      paperId: "paper-1",
      recommendation: "SOUND",
      paper: { status: "SUBMITTED", acceptanceEligibleAt: new Date() },
    } as any);
    prismaMock.review.update.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    const fd = editForm();
    fd.set("recommendation", "NEEDS_REVISION");
    await editReview("review-1", fd);

    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "paper-1" },
        data: { acceptanceEligibleAt: null },
      }),
    );
  });

  it("should NOT reset acceptanceEligibleAt when recommendation stays the same", async () => {
    prismaMock.review.findUnique.mockResolvedValue({
      reviewerId: "user-1",
      paperId: "paper-1",
      recommendation: "SOUND",
      paper: { status: "SUBMITTED", acceptanceEligibleAt: new Date() },
    } as any);
    prismaMock.review.update.mockResolvedValue({} as any);

    await editReview("review-1", editForm());
    expect(prismaMock.paper.update).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// deleteReview
// -----------------------------------------------------------------------
describe("deleteReview", () => {
  const mockReview = (overrides: Record<string, unknown> = {}) => ({
    id: "review-1",
    reviewerId: "user-1",
    paperId: "paper-1",
    isQualifying: true,
    paper: {
      status: "SUBMITTED",
      acceptanceEligibleAt: null,
    },
    ...overrides,
  });

  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await deleteReview("review-1");
    expect(result.error).toContain("signed in");
  });

  it("should return error when review not found", async () => {
    prismaMock.review.findUnique.mockResolvedValue(null);
    const result = await deleteReview("review-1");
    expect(result.error).toContain("not found");
  });

  it("should return error when user is not the reviewer", async () => {
    prismaMock.review.findUnique.mockResolvedValue(
      mockReview({ reviewerId: "other-user" }) as any,
    );
    const result = await deleteReview("review-1");
    expect(result.error).toContain("only delete your own");
  });

  it("should return error when paper is PUBLISHED", async () => {
    prismaMock.review.findUnique.mockResolvedValue(
      mockReview({
        paper: {
          status: "PUBLISHED",
          acceptanceEligibleAt: null,
        },
      }) as any,
    );
    const result = await deleteReview("review-1");
    expect(result.error).toContain("submitted");
  });

  it("should delete review and decrement reviewCount", async () => {
    prismaMock.review.findUnique.mockResolvedValue(mockReview() as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.findFirst.mockResolvedValue({
      id: "rep-1",
    } as any);
    prismaMock.reputationEvent.delete.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const result = await deleteReview("review-1");
    expect(result.success).toBe(true);
    expect(prismaMock.review.delete).toHaveBeenCalledWith({
      where: { id: "review-1" },
    });
    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewCount: { decrement: 1 } }),
      }),
    );
  });

  it("should reverse reputation for qualifying review", async () => {
    prismaMock.review.findUnique.mockResolvedValue(mockReview() as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.findFirst.mockResolvedValue({
      id: "rep-1",
    } as any);
    prismaMock.reputationEvent.delete.mockResolvedValue({} as any);
    prismaMock.user.findUnique.mockResolvedValue({
      reputationScore: 10,
    } as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await deleteReview("review-1");
    expect(prismaMock.reputationEvent.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        type: "REVIEW_SUBMITTED",
        sourcePaperId: "paper-1",
      },
    });
    expect(prismaMock.reputationEvent.delete).toHaveBeenCalledWith({
      where: { id: "rep-1" },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          reputationScore: 10 - REPUTATION_POINTS.REVIEW_SUBMITTED,
        },
      }),
    );
  });

  it("should NOT reverse reputation for non-qualifying review", async () => {
    prismaMock.review.findUnique.mockResolvedValue(
      mockReview({ isQualifying: false }) as any,
    );
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await deleteReview("review-1");
    expect(prismaMock.reputationEvent.findFirst).not.toHaveBeenCalled();
  });

  it("should reset acceptanceEligibleAt when paper is in cool-off", async () => {
    prismaMock.review.findUnique.mockResolvedValue(
      mockReview({
        paper: {
          status: "SUBMITTED",
          acceptanceEligibleAt: new Date(),
        },
      }) as any,
    );
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.findFirst.mockResolvedValue({
      id: "rep-1",
    } as any);
    prismaMock.reputationEvent.delete.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await deleteReview("review-1");
    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ acceptanceEligibleAt: null }),
      }),
    );
  });

  it("should call tryAcceptPaper after deletion", async () => {
    prismaMock.review.findUnique.mockResolvedValue(mockReview() as any);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.review.delete.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.findFirst.mockResolvedValue({
      id: "rep-1",
    } as any);
    prismaMock.reputationEvent.delete.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await deleteReview("review-1");
    expect(tryAcceptPaper).toHaveBeenCalledWith("paper-1");
  });
});

// -----------------------------------------------------------------------
// getReviews — anonymous masking
// -----------------------------------------------------------------------
describe("getReviews", () => {
  const makeDbReview = (overrides: Record<string, unknown> = {}) => ({
    id: "review-1",
    methodologyScore: 7,
    noveltyScore: 6,
    clarityScore: 8,
    reproducibilityScore: 5,
    ethicsScore: 9,
    summary: "Good paper",
    strengthsText: "Strong methodology",
    weaknessesText: "Needs more data",
    detailedComments: "",
    recommendation: "SOUND",
    confidenceLevel: 3,
    conflictOfInterest: null,
    isAnonymous: false,
    createdAt: new Date(),
    editedAt: null,
    reviewer: {
      id: "reviewer-1",
      name: "Jane Smith",
      honorific: "Dr.",
      avatarUrl: null,
      reputationScore: 100,
      researchAreas: [],
    },
    ...overrides,
  });

  it("should return reviewer identity for non-anonymous reviews", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      disciplines: ["ml"],
    } as any);
    prismaMock.review.findMany.mockResolvedValue([makeDbReview()] as any);

    const reviews = await getReviews("paper-1");
    expect(reviews[0].reviewer.name).toBe("Jane Smith");
    expect(reviews[0].reviewer.id).toBe("reviewer-1");
  });

  it("should mask anonymous reviewer for non-admin, non-self viewers", async () => {
    setAuthenticated({
      user: {
        id: "some-other-user",
        name: "Other",
        email: "other@test.com",
        role: "USER" as const,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    prismaMock.paper.findUnique.mockResolvedValue({
      disciplines: ["ml"],
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeDbReview({ isAnonymous: true }),
    ] as any);

    const reviews = await getReviews("paper-1");
    expect(reviews[0].reviewer.name).toBe("Anonymous Reviewer");
    expect(reviews[0].reviewer.id).toBe("anonymous");
  });

  it("should NOT mask anonymous reviewer for the reviewer themselves", async () => {
    setAuthenticated({
      user: {
        id: "reviewer-1",
        name: "Jane",
        email: "jane@test.com",
        role: "USER" as const,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    prismaMock.paper.findUnique.mockResolvedValue({
      disciplines: ["ml"],
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeDbReview({ isAnonymous: true }),
    ] as any);

    const reviews = await getReviews("paper-1");
    expect(reviews[0].reviewer.name).toBe("Jane Smith");
    expect(reviews[0].reviewer.id).toBe("reviewer-1");
  });

  it("should NOT mask anonymous reviewer for admins", async () => {
    setAuthenticated({
      user: {
        id: "some-admin",
        name: "Admin",
        email: "admin@test.com",
        role: "ADMIN" as const,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    prismaMock.paper.findUnique.mockResolvedValue({
      disciplines: ["ml"],
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeDbReview({ isAnonymous: true }),
    ] as any);

    const reviews = await getReviews("paper-1");
    expect(reviews[0].reviewer.name).toBe("Jane Smith");
    expect(reviews[0].reviewer.id).toBe("reviewer-1");
  });
});
