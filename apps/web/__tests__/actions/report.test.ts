import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import { setAuthenticated } from "../helpers/mock-auth";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/paper-acceptance", () => ({
  tryAcceptPaper: vi.fn(),
}));

import { resolveReport } from "@/actions/report";
import { tryAcceptPaper } from "@/lib/paper-acceptance";

const moderatorSession = {
  user: { id: "mod-1", name: "Moderator", email: "mod@example.com", role: "MODERATOR" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

beforeEach(() => {
  setAuthenticated(moderatorSession);
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(tryAcceptPaper).mockReset();
});

describe("resolveReport", () => {
  it("should call tryAcceptPaper when resolving a REVIEW report on SUBMITTED paper", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      status: "PENDING",
      targetType: "REVIEW",
      targetId: "review-1",
    } as any);
    prismaMock.report.update.mockResolvedValue({} as any);
    prismaMock.review.findUnique.mockResolvedValue({
      paperId: "paper-1",
      paper: { status: "SUBMITTED" },
    } as any);

    await resolveReport("report-1", "resolve");
    expect(tryAcceptPaper).toHaveBeenCalledWith("paper-1");
  });

  it("should call tryAcceptPaper when dismissing a REVIEW report on SUBMITTED paper", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      status: "PENDING",
      targetType: "REVIEW",
      targetId: "review-1",
    } as any);
    prismaMock.report.update.mockResolvedValue({} as any);
    prismaMock.review.findUnique.mockResolvedValue({
      paperId: "paper-1",
      paper: { status: "SUBMITTED" },
    } as any);

    await resolveReport("report-1", "dismiss");
    expect(tryAcceptPaper).toHaveBeenCalledWith("paper-1");
  });

  it("should NOT call tryAcceptPaper for COMMENT reports", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      status: "PENDING",
      targetType: "COMMENT",
      targetId: "comment-1",
    } as any);
    prismaMock.report.update.mockResolvedValue({} as any);

    await resolveReport("report-1", "resolve");
    expect(tryAcceptPaper).not.toHaveBeenCalled();
  });

  it("should NOT call tryAcceptPaper for PAPER reports", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      status: "PENDING",
      targetType: "PAPER",
      targetId: "paper-1",
    } as any);
    prismaMock.report.update.mockResolvedValue({} as any);

    await resolveReport("report-1", "resolve");
    expect(tryAcceptPaper).not.toHaveBeenCalled();
  });

  it("should NOT call tryAcceptPaper when review's paper is PUBLISHED", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      status: "PENDING",
      targetType: "REVIEW",
      targetId: "review-1",
    } as any);
    prismaMock.report.update.mockResolvedValue({} as any);
    prismaMock.review.findUnique.mockResolvedValue({
      paperId: "paper-1",
      paper: { status: "PUBLISHED" },
    } as any);

    await resolveReport("report-1", "resolve");
    expect(tryAcceptPaper).not.toHaveBeenCalled();
  });
});
