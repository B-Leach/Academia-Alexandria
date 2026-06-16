import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import {
  setAuthenticated,
  setUnauthenticated,
  setUnverified,
  defaultSession,
} from "../helpers/mock-auth";
import { buildFormData } from "../helpers/form-data";
import { RedirectError } from "../setup";
import { revalidatePath } from "next/cache";

import {
  createPaper,
  updatePaper,
  submitPaper,
  deletePaper,
} from "@/actions/paper";
import { tryAcceptPaper } from "@/lib/paper-acceptance";
import { REVIEW_DEFAULTS } from "@academia-alexandria/shared";

beforeEach(() => {
  setAuthenticated();
  vi.mocked(revalidatePath).mockReset();
});

// -----------------------------------------------------------------------
// createPaper
// -----------------------------------------------------------------------
describe("createPaper", () => {
  const validForm = () =>
    buildFormData({
      title: "My Paper",
      abstract: "A decent abstract",
      content: "Some content",
      disciplines: ["machine-learning"],
      keywords: "AI, science",
      coAuthorIds: "",
    });

  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await createPaper(validForm());
    expect(result.error).toBe("You must be signed in");
  });

  it("should return error for empty title", async () => {
    const fd = buildFormData({
      title: "",
      abstract: "",
      content: "",
      keywords: "",
      coAuthorIds: "",
    });
    const result = await createPaper(fd);
    expect(result.error).toBeDefined();
  });

  it("should create a paper with valid data", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.paper.create.mockResolvedValue({ id: "paper-1" } as any);

    const result = await createPaper(validForm());
    expect(result.success).toBe(true);
    expect(result.paperId).toBe("paper-1");
  });

  it("should return the created paperId", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.paper.create.mockResolvedValue({ id: "paper-abc" } as any);

    const result = await createPaper(validForm());
    expect(result.paperId).toBe("paper-abc");
  });

  it("should create invitations (not PaperAuthors) for co-author IDs", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: "co-1" }] as any);
    prismaMock.paper.create.mockResolvedValue({ id: "paper-1" } as any);
    prismaMock.coAuthorInvitation.createMany.mockResolvedValue({ count: 1 });
    prismaMock.user.findUnique.mockResolvedValue({ name: "Author" } as any);

    const fd = buildFormData({
      title: "Co-authored Paper",
      abstract: "",
      content: "",
      disciplines: [],
      keywords: "",
      coAuthorIds: "co-1",
    });

    const result = await createPaper(fd);
    expect(result.success).toBe(true);
    expect(prismaMock.coAuthorInvitation.createMany).toHaveBeenCalledWith({
      data: [
        {
          paperId: "paper-1",
          inviterId: defaultSession.user.id,
          inviteeId: "co-1",
          order: 1,
        },
      ],
    });
  });

  it("should return error when co-author ID is not found", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    const fd = buildFormData({
      title: "Paper",
      abstract: "",
      content: "",
      disciplines: [],
      keywords: "",
      coAuthorIds: "unknown-id",
    });

    const result = await createPaper(fd);
    expect(result.error).toContain("could not be found");
  });

  it("should call revalidatePath for /papers and /dashboard", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.paper.create.mockResolvedValue({ id: "p1" } as any);

    await createPaper(validForm());
    expect(revalidatePath).toHaveBeenCalledWith("/papers");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// -----------------------------------------------------------------------
// updatePaper
// -----------------------------------------------------------------------
describe("updatePaper", () => {
  const fd = () =>
    buildFormData({
      title: "Updated Title",
      abstract: "",
      content: "",
      keywords: "",
    });

  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await updatePaper("p1", fd());
    expect(result.error).toBe("You must be signed in");
  });

  it("should return error when user is not an author", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue(null);
    const result = await updatePaper("p1", fd());
    expect(result.error).toContain("not an author");
  });

  it("should return error when paper is not found", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue(null);
    const result = await updatePaper("p1", fd());
    expect(result.error).toBe("Paper not found");
  });

  it("should return error when paper is retracted", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "RETRACTED",
    } as any);
    const result = await updatePaper("p1", fd());
    expect(result.error).toContain("retracted");
  });

  it("should update paper with valid data", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({ status: "DRAFT" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    const result = await updatePaper("p1", fd());
    expect(result.success).toBe(true);
  });

  it("should not increment version for DRAFT papers", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({ status: "DRAFT" } as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await updatePaper("p1", fd());
    const updateCall = prismaMock.paper.update.mock.calls[0][0];
    expect(updateCall.data.version).toBeUndefined();
  });

  it("should increment version for SUBMITTED papers", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      version: 1,
      title: "T",
      abstract: "",
      content: "",
      pdfUrl: null,
      license: "",
      funding: "",
      keywords: [],
      disciplines: [],
    } as any);
    prismaMock.paperAuthor.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.paperVersion.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await updatePaper("p1", fd());
    const updateCall = prismaMock.paper.update.mock.calls[0][0];
    expect(updateCall.data.version).toEqual({ increment: 1 });
  });

  it("should increment version for PUBLISHED papers", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "PUBLISHED",
      version: 2,
      title: "T",
      abstract: "",
      content: "",
      pdfUrl: null,
      license: "",
      funding: "",
      keywords: [],
      disciplines: [],
    } as any);
    prismaMock.paperAuthor.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.paperVersion.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await updatePaper("p1", fd());
    const updateCall = prismaMock.paper.update.mock.calls[0][0];
    expect(updateCall.data.version).toEqual({ increment: 1 });
  });
});

// -----------------------------------------------------------------------
// submitPaper
// -----------------------------------------------------------------------
describe("submitPaper", () => {
  const validPaper = {
    status: "DRAFT",
    title: "A Valid Title Here",
    abstract: "a".repeat(50),
    content: "a".repeat(100),
    disciplines: ["machine-learning"],
    keywords: ["AI"],
  };

  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await submitPaper("p1");
    expect(result.error).toBe("You must be signed in");
  });

  it("should return error when email is not verified", async () => {
    setAuthenticated();
    setUnverified();
    const result = await submitPaper("p1");
    expect(result.error).toContain("verify your email");
  });

  it("should return error when user is not an author", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue(null);
    const result = await submitPaper("p1");
    expect(result.error).toContain("not an author");
  });

  it("should return error when paper is not found", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue(null);
    const result = await submitPaper("p1");
    expect(result.error).toBe("Paper not found");
  });

  it("should return error when paper is already SUBMITTED", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      ...validPaper,
      status: "SUBMITTED",
    } as any);
    const result = await submitPaper("p1");
    expect(result.error).toContain("already been submitted");
  });

  it("should return error when paper is already PUBLISHED", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      ...validPaper,
      status: "PUBLISHED",
    } as any);
    const result = await submitPaper("p1");
    expect(result.error).toContain("already been submitted");
  });

  it("should return error when paper is RETRACTED", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      ...validPaper,
      status: "RETRACTED",
    } as any);
    const result = await submitPaper("p1");
    expect(result.error).toContain("retracted");
  });

  it("should return error when paper content is incomplete", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      ...validPaper,
      abstract: "Short",
    } as any);
    const result = await submitPaper("p1");
    expect(result.error).toBeDefined();
  });

  it("should set status to SUBMITTED and redirect", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue(validPaper as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    await expect(submitPaper("p1")).rejects.toThrow(RedirectError);

    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUBMITTED" }),
      }),
    );
  });

  it("should redirect to /papers/{paperId}/published", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({} as any);
    prismaMock.paper.findUnique.mockResolvedValue(validPaper as any);
    prismaMock.paper.update.mockResolvedValue({} as any);

    try {
      await submitPaper("p1");
    } catch (e) {
      expect(e).toBeInstanceOf(RedirectError);
      expect((e as RedirectError).url).toBe("/papers/p1/published");
    }
  });
});

// -----------------------------------------------------------------------
// tryAcceptPaper
// -----------------------------------------------------------------------
describe("tryAcceptPaper", () => {
  let reviewCounter = 0;
  const makeReview = (
    recommendation: string,
    _confidence: number,
    rep: number,
    isQualifying: boolean = false,
  ) => ({
    id: `review-${++reviewCounter}`,
    recommendation,
    isQualifying,
    reviewer: {
      id: `rev-${reviewCounter}`,
      reputationScore: rep,
    },
  });

  beforeEach(() => {
    reviewCounter = 0;
    prismaMock.report.count.mockResolvedValue(0);
  });

  it("should do nothing if paper is not found", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(null);
    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should do nothing if paper is not SUBMITTED", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "DRAFT",
      disciplines: [],
      authors: [],
    } as any);
    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should do nothing if fewer than 3 qualifying reviews", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 50, true),
      makeReview("SOUND", 4, 50, true),
    ] as any);

    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should do nothing if any qualifying review is not SOUND", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 50, true),
      makeReview("SOUND", 4, 50, true),
      makeReview("UNSOUND", 4, 50, true),
    ] as any);

    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should do nothing if any qualifying review is NEEDS_REVISION", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 50, true),
      makeReview("SOUND", 4, 50, true),
      makeReview("NEEDS_REVISION", 3, 50, true),
    ] as any);

    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // acceptanceEligibleAt must be past the cool-off period so tryAcceptPaper proceeds
  const pastCooloff = new Date(Date.now() - (REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_HOURS + 1) * 60 * 60 * 1000);

  it("should accept paper with 3 qualifying SOUND reviews", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
      acceptanceEligibleAt: pastCooloff,
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 50, true),
      makeReview("SOUND", 4, 50, true),
      makeReview("SOUND", 2, 50, true),
    ] as any);
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("should NOT qualify review by high confidence without discipline overlap", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
    } as any);
    // All marked as non-qualifying (no discipline overlap)
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 5, 50, false),
      makeReview("SOUND", 5, 50, false),
      makeReview("SOUND", 5, 50, false),
    ] as any);

    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should qualify review by discipline overlap even with low confidence", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
      acceptanceEligibleAt: pastCooloff,
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 1, 50, true),
      makeReview("SOUND", 1, 50, true),
      makeReview("SOUND", 1, 50, true),
    ] as any);
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("should not count reviews without discipline overlap toward threshold", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
    } as any);
    // 2 qualifying + 1 non-qualifying = only 2 qualifying, below threshold of 3
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 5, 50, true),
      makeReview("SOUND", 5, 50, true),
      makeReview("SOUND", 5, 50, false),
    ] as any);

    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("should use PAPER_ACCEPTED_LOW points when avg reviewer rep < 100", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
      acceptanceEligibleAt: pastCooloff,
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 50, true),
      makeReview("SOUND", 4, 50, true),
      makeReview("SOUND", 2, 50, true),
    ] as any);
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await tryAcceptPaper("p1");

    const repEvent = prismaMock.reputationEvent.create.mock.calls[0][0];
    expect(repEvent.data.points).toBe(5); // PAPER_ACCEPTED_LOW
  });

  it("should use PAPER_ACCEPTED_MID points when avg reviewer rep 100-499", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
      acceptanceEligibleAt: pastCooloff,
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 200, true),
      makeReview("SOUND", 4, 300, true),
      makeReview("SOUND", 2, 250, true),
    ] as any);
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await tryAcceptPaper("p1");

    const repEvent = prismaMock.reputationEvent.create.mock.calls[0][0];
    expect(repEvent.data.points).toBe(10); // PAPER_ACCEPTED_MID
  });

  it("should use PAPER_ACCEPTED_HIGH points when avg reviewer rep >= 500", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
      acceptanceEligibleAt: pastCooloff,
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 600, true),
      makeReview("SOUND", 4, 800, true),
      makeReview("SOUND", 2, 500, true),
    ] as any);
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await tryAcceptPaper("p1");

    const repEvent = prismaMock.reputationEvent.create.mock.calls[0][0];
    expect(repEvent.data.points).toBe(15); // PAPER_ACCEPTED_HIGH
  });

  it("should create reputation events for each author", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }, { userId: "a2" }],
      acceptanceEligibleAt: pastCooloff,
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 50, true),
      makeReview("SOUND", 4, 50, true),
      makeReview("SOUND", 2, 50, true),
    ] as any);
    prismaMock.report.count.mockResolvedValue(0);
    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn(prismaMock),
    );
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await tryAcceptPaper("p1");

    // 2 authors = 2 rep events
    expect(prismaMock.reputationEvent.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.update).toHaveBeenCalledTimes(2);
  });

  it("should NOT accept when a qualifying review has a PENDING report", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      status: "SUBMITTED",
      disciplines: ["ml"],
      authors: [{ userId: "a1" }],
      acceptanceEligibleAt: pastCooloff,
    } as any);
    prismaMock.review.findMany.mockResolvedValue([
      makeReview("SOUND", 3, 50, true),
      makeReview("SOUND", 4, 50, true),
      makeReview("SOUND", 2, 50, true),
    ] as any);
    prismaMock.report.count.mockResolvedValue(1);

    await tryAcceptPaper("p1");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// deletePaper
// -----------------------------------------------------------------------
describe("deletePaper", () => {
  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await deletePaper("p1");
    expect(result.error).toBe("You must be signed in");
  });

  it("should return error when user is not an author", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue(null);
    const result = await deletePaper("p1");
    expect(result.error).toContain("not an author");
  });

  it("should return error when paper is PUBLISHED", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({
      paper: { status: "PUBLISHED" },
    } as any);
    const result = await deletePaper("p1");
    expect(result.error).toContain("Cannot delete");
  });

  it("should return error when paper is RETRACTED", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({
      paper: { status: "RETRACTED" },
    } as any);
    const result = await deletePaper("p1");
    expect(result.error).toContain("Cannot delete");
  });

  it("should delete paper and redirect for DRAFT", async () => {
    prismaMock.paperAuthor.findUnique.mockResolvedValue({
      paper: { status: "DRAFT" },
    } as any);
    prismaMock.paper.delete.mockResolvedValue({} as any);

    await expect(deletePaper("p1")).rejects.toThrow(RedirectError);
    expect(prismaMock.paper.delete).toHaveBeenCalledWith({
      where: { id: "p1" },
    });
  });
});
