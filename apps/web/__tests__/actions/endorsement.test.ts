import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import { setAuthenticated, setUnauthenticated } from "../helpers/mock-auth";
import { buildFormData } from "../helpers/form-data";
import { revalidatePath } from "next/cache";

import { createEndorsement } from "@/actions/endorsement";
import { REPUTATION_POINTS, REPUTATION_THRESHOLDS } from "@academia-alexandria/shared";

beforeEach(() => {
  setAuthenticated();
  vi.mocked(revalidatePath).mockReset();
});

const validForm = () =>
  buildFormData({
    paperId: "paper-1",
    statement: "This is a great paper.",
  });

const paperFixture = {
  id: "paper-1",
  status: "PUBLISHED",
  authors: [{ userId: "author-1" }],
};

describe("createEndorsement", () => {
  it("should return error when not signed in", async () => {
    setUnauthenticated();
    const result = await createEndorsement(validForm());
    expect(result.error).toContain("signed in");
  });

  it("should return error for invalid form data", async () => {
    const fd = buildFormData({ paperId: "" });
    const result = await createEndorsement(fd);
    expect(result.error).toBeDefined();
  });

  it("should return error when user reputation is below CAN_ENDORSE threshold", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 50 } as any);
    const result = await createEndorsement(validForm());
    expect(result.error).toContain(`${REPUTATION_THRESHOLDS.CAN_ENDORSE}`);
  });

  it("should return error when paper is not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue(null);
    const result = await createEndorsement(validForm());
    expect(result.error).toContain("not found or not published");
  });

  it("should return error when paper is not PUBLISHED", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue({ ...paperFixture, status: "SUBMITTED" } as any);
    const result = await createEndorsement(validForm());
    expect(result.error).toContain("not found or not published");
  });

  it("should return error when user is an author of the paper", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      ...paperFixture,
      authors: [{ userId: "user-1" }],
    } as any);
    const result = await createEndorsement(validForm());
    expect(result.error).toContain("cannot endorse your own");
  });

  it("should return error when user has already endorsed the paper", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.endorsement.findUnique.mockResolvedValue({ id: "existing" } as any);
    const result = await createEndorsement(validForm());
    expect(result.error).toContain("already endorsed");
  });

  it("should create endorsement successfully", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.endorsement.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.endorsement.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    const result = await createEndorsement(validForm());
    expect(result.success).toBe(true);
  });

  it("should increment paper endorsementCount", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.endorsement.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.endorsement.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createEndorsement(validForm());
    expect(prismaMock.paper.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { endorsementCount: { increment: 1 } },
      })
    );
  });

  it("should award ENDORSEMENT_RECEIVED to authors (non-trusted endorser)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.endorsement.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.endorsement.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createEndorsement(validForm());

    // First rep event should be for the author with ENDORSEMENT_RECEIVED
    const firstRepCall = prismaMock.reputationEvent.create.mock.calls[0][0];
    expect(firstRepCall.data.type).toBe("ENDORSEMENT_RECEIVED");
    expect(firstRepCall.data.points).toBe(REPUTATION_POINTS.ENDORSEMENT_RECEIVED);
  });

  it("should award PAPER_ENDORSED_BY_TRUSTED to authors (trusted endorser >= 500)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 600 } as any);
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.endorsement.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.endorsement.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createEndorsement(validForm());

    const firstRepCall = prismaMock.reputationEvent.create.mock.calls[0][0];
    expect(firstRepCall.data.type).toBe("PAPER_ENDORSED_BY_TRUSTED");
    expect(firstRepCall.data.points).toBe(REPUTATION_POINTS.PAPER_ENDORSED_BY_TRUSTED);
  });

  it("should award ENDORSEMENT_GIVEN to the endorser", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.endorsement.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.endorsement.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createEndorsement(validForm());

    // Last rep event should be for the endorser
    const lastCall = prismaMock.reputationEvent.create.mock.calls.at(-1)![0];
    expect(lastCall.data.type).toBe("ENDORSEMENT_GIVEN");
    expect(lastCall.data.points).toBe(REPUTATION_POINTS.ENDORSEMENT_GIVEN);
  });

  it("should create reputation events for all co-authors", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      ...paperFixture,
      authors: [{ userId: "a1" }, { userId: "a2" }, { userId: "a3" }],
    } as any);
    prismaMock.endorsement.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.endorsement.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createEndorsement(validForm());

    // 3 author events + 1 endorser event = 4
    expect(prismaMock.reputationEvent.create).toHaveBeenCalledTimes(4);
  });

  it("should call revalidatePath for the paper", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ reputationScore: 200 } as any);
    prismaMock.paper.findUnique.mockResolvedValue(paperFixture as any);
    prismaMock.endorsement.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    prismaMock.endorsement.create.mockResolvedValue({} as any);
    prismaMock.paper.update.mockResolvedValue({} as any);
    prismaMock.reputationEvent.create.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue({} as any);

    await createEndorsement(validForm());
    expect(revalidatePath).toHaveBeenCalledWith("/papers/paper-1");
  });
});
