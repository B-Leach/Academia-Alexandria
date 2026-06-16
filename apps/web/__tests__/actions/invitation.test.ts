import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";
import {
  setAuthenticated,
  setUnauthenticated,
  defaultSession,
} from "../helpers/mock-auth";
import { revalidatePath } from "next/cache";

import {
  getMyInvitations,
  respondToInvitation,
} from "@/actions/invitation";

beforeEach(() => {
  setAuthenticated();
  vi.mocked(revalidatePath).mockReset();
});

// -----------------------------------------------------------------------
// getMyInvitations
// -----------------------------------------------------------------------
describe("getMyInvitations", () => {
  it("should return empty array when not authenticated", async () => {
    setUnauthenticated();
    const result = await getMyInvitations();
    expect(result).toEqual([]);
  });

  it("should return pending invitations for current user", async () => {
    const mockInvitations = [
      {
        id: "inv-1",
        createdAt: new Date(),
        paper: { id: "paper-1", title: "Test Paper" },
        inviter: { id: "user-2", name: "Jane Doe" },
      },
    ];
    prismaMock.coAuthorInvitation.findMany.mockResolvedValue(
      mockInvitations as any,
    );

    const result = await getMyInvitations();
    expect(result).toHaveLength(1);
    expect(result[0].paper.title).toBe("Test Paper");
    expect(result[0].inviter.name).toBe("Jane Doe");
  });
});

// -----------------------------------------------------------------------
// respondToInvitation
// -----------------------------------------------------------------------
describe("respondToInvitation", () => {
  it("should return error when not authenticated", async () => {
    setUnauthenticated();
    const result = await respondToInvitation("inv-1", true);
    expect(result.error).toBeTruthy();
  });

  it("should return error when invitation not found", async () => {
    prismaMock.coAuthorInvitation.findUnique.mockResolvedValue(null);

    const result = await respondToInvitation("inv-999", true);
    expect(result.error).toBe("Invitation not found");
  });

  it("should return error when invitation belongs to another user", async () => {
    prismaMock.coAuthorInvitation.findUnique.mockResolvedValue({
      id: "inv-1",
      paperId: "paper-1",
      inviterId: "user-2",
      inviteeId: "other-user",
      status: "PENDING",
      order: 1,
      invitee: { name: "Other" },
    } as any);

    const result = await respondToInvitation("inv-1", true);
    expect(result.error).toBe("This invitation is not for you");
  });

  it("should return error when invitation already responded to", async () => {
    prismaMock.coAuthorInvitation.findUnique.mockResolvedValue({
      id: "inv-1",
      paperId: "paper-1",
      inviterId: "user-2",
      inviteeId: defaultSession.user.id,
      status: "ACCEPTED",
      order: 1,
      invitee: { name: "Test" },
    } as any);

    const result = await respondToInvitation("inv-1", true);
    expect(result.error).toBe("This invitation has already been responded to");
  });

  it("should create PaperAuthor and update invitation when accepted", async () => {
    prismaMock.coAuthorInvitation.findUnique.mockResolvedValue({
      id: "inv-1",
      paperId: "paper-1",
      inviterId: "user-2",
      inviteeId: defaultSession.user.id,
      status: "PENDING",
      order: 2,
      invitee: { name: "Test User" },
      paper: { status: "DRAFT" },
    } as any);
    prismaMock.$transaction.mockResolvedValue([{}, {}] as any);

    const result = await respondToInvitation("inv-1", true);
    expect(result.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/papers/paper-1");
  });

  it("should update invitation without creating PaperAuthor when declined", async () => {
    prismaMock.coAuthorInvitation.findUnique.mockResolvedValue({
      id: "inv-1",
      paperId: "paper-1",
      inviterId: "user-2",
      inviteeId: defaultSession.user.id,
      status: "PENDING",
      order: 1,
      invitee: { name: "Test User" },
      paper: { status: "DRAFT" },
    } as any);
    prismaMock.coAuthorInvitation.update.mockResolvedValue({} as any);

    const result = await respondToInvitation("inv-1", false);
    expect(result.success).toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.coAuthorInvitation.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "DECLINED", respondedAt: expect.any(Date) },
    });
  });
});
