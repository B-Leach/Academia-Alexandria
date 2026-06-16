import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../helpers/mock-db";

// Must use vi.hoisted so these are available inside the vi.mock factory
const {
  mockSendEmail,
  mockIsEmailEnabled,
  mockBuildUnsubscribeUrl,
  mockGetUnsubscribeToken,
} = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockIsEmailEnabled: vi.fn(),
  mockBuildUnsubscribeUrl: vi.fn(
    () => "https://example.com/api/email/unsubscribe?user=u&pref=p&sig=s",
  ),
  mockGetUnsubscribeToken: vi.fn(() => Promise.resolve("mock-token")),
}));

vi.mock("@academia-alexandria/email", () => ({
  sendEmail: mockSendEmail,
  isEmailEnabled: mockIsEmailEnabled,
  WelcomeEmail: vi.fn(() => "WelcomeEmail"),
  ReviewReceivedEmail: vi.fn(() => "ReviewReceivedEmail"),
  CommentReceivedEmail: vi.fn(() => "CommentReceivedEmail"),
  EndorsementReceivedEmail: vi.fn(() => "EndorsementReceivedEmail"),
  PaperAcceptedEmail: vi.fn(() => "PaperAcceptedEmail"),
  BountyPayoutEmail: vi.fn(() => "BountyPayoutEmail"),
  CoAuthorInvitationEmail: vi.fn(() => "CoAuthorInvitationEmail"),
  CoAuthorResponseEmail: vi.fn(() => "CoAuthorResponseEmail"),
}));

vi.mock("@/lib/unsubscribe", () => ({
  getUnsubscribeToken: mockGetUnsubscribeToken,
  buildUnsubscribeUrl: mockBuildUnsubscribeUrl,
  VALID_PREF_KEYS: [
    "notifyReviews",
    "notifyComments",
    "notifyEndorsements",
    "notifyPaperStatus",
    "notifyBounty",
    "notifyInvitations",
  ],
}));

import {
  notifyWelcome,
  notifyReviewReceived,
  notifyCommentReceived,
  notifyEndorsementReceived,
  notifyPaperAccepted,
  notifyBountyPayout,
  notifyCoAuthorInvitation,
  notifyCoAuthorResponse,
} from "@/lib/email-notifications";

beforeEach(() => {
  mockSendEmail.mockReset();
  mockIsEmailEnabled.mockReturnValue(true);
});

// -----------------------------------------------------------------------
// notifyWelcome
// -----------------------------------------------------------------------
describe("notifyWelcome", () => {
  it("should send welcome email to new user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Alice",
      email: "alice@example.com",
    } as any);

    await notifyWelcome("user-1");

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        subject: "Welcome to Academia Alexandria",
      }),
    );
  });

  it("should not send when email is disabled", async () => {
    mockIsEmailEnabled.mockReturnValue(false);

    await notifyWelcome("user-1");

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should not throw when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(notifyWelcome("nonexistent")).resolves.not.toThrow();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should not throw when sendEmail fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Alice",
      email: "alice@example.com",
    } as any);
    mockSendEmail.mockRejectedValue(new Error("Resend error"));

    await expect(notifyWelcome("user-1")).resolves.not.toThrow();
  });
});

// -----------------------------------------------------------------------
// notifyReviewReceived
// -----------------------------------------------------------------------
describe("notifyReviewReceived", () => {
  const mockPaper = {
    title: "Test Paper",
    authors: [
      {
        user: {
          id: "author-1",
          name: "Author One",
          email: "author1@example.com",
          notifyReviews: true,
        },
      },
      {
        user: {
          id: "author-2",
          name: "Author Two",
          email: "author2@example.com",
          notifyReviews: true,
        },
      },
    ],
  };

  it("should send email to all paper authors", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(mockPaper as any);

    await notifyReviewReceived("paper-1", "Reviewer Name", "SOUND");

    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "author1@example.com" }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "author2@example.com" }),
    );
  });

  it("should skip authors with notifyReviews disabled", async () => {
    const paper = {
      ...mockPaper,
      authors: [
        {
          user: {
            id: "author-1",
            name: "Author One",
            email: "author1@example.com",
            notifyReviews: true,
          },
        },
        {
          user: {
            id: "author-2",
            name: "Author Two",
            email: "author2@example.com",
            notifyReviews: false,
          },
        },
      ],
    };
    prismaMock.paper.findUnique.mockResolvedValue(paper as any);

    await notifyReviewReceived("paper-1", "Reviewer Name", "SOUND");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "author1@example.com" }),
    );
  });

  it("should not send when email is disabled", async () => {
    mockIsEmailEnabled.mockReturnValue(false);

    await notifyReviewReceived("paper-1", "Reviewer", "SOUND");

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should not throw when sendEmail fails", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(mockPaper as any);
    mockSendEmail.mockRejectedValue(new Error("fail"));

    await expect(
      notifyReviewReceived("paper-1", "Reviewer", "SOUND"),
    ).resolves.not.toThrow();
  });
});

// -----------------------------------------------------------------------
// notifyCommentReceived
// -----------------------------------------------------------------------
describe("notifyCommentReceived", () => {
  const mockPaperWithAuthors = {
    title: "Test Paper",
    authors: [
      {
        user: {
          id: "author-1",
          name: "Author",
          email: "author@example.com",
          notifyComments: true,
        },
      },
    ],
  };

  it("should notify paper authors on new comment", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(mockPaperWithAuthors as any);
    prismaMock.user.findUnique.mockResolvedValue({ name: "Commenter" } as any);

    await notifyCommentReceived("paper-1", "commenter-1", "Great paper!");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "author@example.com" }),
    );
  });

  it("should not notify the commenter if they are an author", async () => {
    const paper = {
      title: "Test Paper",
      authors: [
        {
          user: {
            id: "commenter-1",
            name: "Self",
            email: "self@example.com",
            notifyComments: true,
          },
        },
      ],
    };
    prismaMock.paper.findUnique.mockResolvedValue(paper as any);
    prismaMock.user.findUnique.mockResolvedValue({ name: "Self" } as any);

    await notifyCommentReceived("paper-1", "commenter-1", "My own comment");

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should notify parent comment author on reply", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(mockPaperWithAuthors as any);
    prismaMock.user.findUnique.mockResolvedValue({ name: "Replier" } as any);
    prismaMock.comment.findUnique.mockResolvedValue({
      author: {
        id: "parent-author",
        name: "Parent",
        email: "parent@example.com",
        notifyComments: true,
      },
    } as any);

    await notifyCommentReceived(
      "paper-1",
      "replier-1",
      "I agree!",
      "parent-comment-id",
    );

    // Should notify parent comment author + paper author = 2
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "parent@example.com" }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "author@example.com" }),
    );
  });

  it("should deduplicate when parent comment author is also a paper author", async () => {
    const paper = {
      title: "Test Paper",
      authors: [
        {
          user: {
            id: "author-1",
            name: "Author",
            email: "author@example.com",
            notifyComments: true,
          },
        },
      ],
    };
    prismaMock.paper.findUnique.mockResolvedValue(paper as any);
    prismaMock.user.findUnique.mockResolvedValue({ name: "Replier" } as any);
    prismaMock.comment.findUnique.mockResolvedValue({
      author: {
        id: "author-1",
        name: "Author",
        email: "author@example.com",
        notifyComments: true,
      },
    } as any);

    await notifyCommentReceived("paper-1", "replier-1", "Reply!", "parent-id");

    // Should only send once — deduplicated
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("should skip authors with notifyComments disabled", async () => {
    const paper = {
      title: "Test Paper",
      authors: [
        {
          user: {
            id: "author-1",
            name: "Author",
            email: "author@example.com",
            notifyComments: false,
          },
        },
      ],
    };
    prismaMock.paper.findUnique.mockResolvedValue(paper as any);
    prismaMock.user.findUnique.mockResolvedValue({ name: "Commenter" } as any);

    await notifyCommentReceived("paper-1", "commenter-1", "Nice work");

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should truncate long comments to 200 chars", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(mockPaperWithAuthors as any);
    prismaMock.user.findUnique.mockResolvedValue({ name: "Commenter" } as any);

    const longComment = "A".repeat(300);
    await notifyCommentReceived("paper-1", "commenter-1", longComment);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    // The CommentReceivedEmail mock is called with the snippet
    const { CommentReceivedEmail } = await import("@academia-alexandria/email");
    expect(CommentReceivedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        commentSnippet: "A".repeat(200) + "...",
      }),
    );
  });
});

// -----------------------------------------------------------------------
// notifyEndorsementReceived
// -----------------------------------------------------------------------
describe("notifyEndorsementReceived", () => {
  it("should notify paper authors about endorsement", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Test Paper",
      authors: [
        {
          user: {
            id: "author-1",
            name: "Author",
            email: "author@example.com",
            notifyEndorsements: true,
          },
        },
      ],
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Endorser",
      reputationScore: 500,
    } as any);
    prismaMock.endorsement.findUnique.mockResolvedValue({
      statement: "Great work!",
    } as any);

    await notifyEndorsementReceived("paper-1", "endorser-1");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "author@example.com" }),
    );
  });

  it("should skip authors with notifyEndorsements disabled", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Test Paper",
      authors: [
        {
          user: {
            id: "author-1",
            name: "Author",
            email: "author@example.com",
            notifyEndorsements: false,
          },
        },
      ],
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Endorser",
      reputationScore: 200,
    } as any);
    prismaMock.endorsement.findUnique.mockResolvedValue({
      statement: null,
    } as any);

    await notifyEndorsementReceived("paper-1", "endorser-1");

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should not throw when sendEmail fails", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Test Paper",
      authors: [
        {
          user: {
            id: "author-1",
            name: "Author",
            email: "author@example.com",
            notifyEndorsements: true,
          },
        },
      ],
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({
      name: "E",
      reputationScore: 100,
    } as any);
    prismaMock.endorsement.findUnique.mockResolvedValue({
      statement: null,
    } as any);
    mockSendEmail.mockRejectedValue(new Error("fail"));

    await expect(
      notifyEndorsementReceived("paper-1", "e-1"),
    ).resolves.not.toThrow();
  });
});

// -----------------------------------------------------------------------
// notifyPaperAccepted
// -----------------------------------------------------------------------
describe("notifyPaperAccepted", () => {
  it("should notify all authors about paper acceptance", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Accepted Paper",
      authors: [
        {
          user: {
            id: "a1",
            name: "Author 1",
            email: "a1@example.com",
            notifyPaperStatus: true,
          },
        },
        {
          user: {
            id: "a2",
            name: "Author 2",
            email: "a2@example.com",
            notifyPaperStatus: true,
          },
        },
      ],
    } as any);

    await notifyPaperAccepted("paper-1", 15);

    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("should skip authors with notifyPaperStatus disabled", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Accepted Paper",
      authors: [
        {
          user: {
            id: "a1",
            name: "Author 1",
            email: "a1@example.com",
            notifyPaperStatus: false,
          },
        },
      ],
    } as any);

    await notifyPaperAccepted("paper-1", 15);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should not throw when paper not found", async () => {
    prismaMock.paper.findUnique.mockResolvedValue(null);

    await expect(notifyPaperAccepted("nope", 15)).resolves.not.toThrow();
  });
});

// -----------------------------------------------------------------------
// notifyBountyPayout
// -----------------------------------------------------------------------
describe("notifyBountyPayout", () => {
  it("should notify reviewer about payout", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Reviewer",
      email: "reviewer@example.com",
      notifyBounty: true,
    } as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Bounty Paper",
    } as any);

    await notifyBountyPayout("reviewer-1", "paper-1", 2500, false);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "reviewer@example.com",
        subject: "You earned $25.00 for your review",
      }),
    );
  });

  it("should skip when notifyBounty is disabled", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Reviewer",
      email: "reviewer@example.com",
      notifyBounty: false,
    } as any);
    prismaMock.paper.findUnique.mockResolvedValue({ title: "Paper" } as any);

    await notifyBountyPayout("reviewer-1", "paper-1", 2500, false);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("should not throw when sendEmail fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "R",
      email: "r@example.com",
      notifyBounty: true,
    } as any);
    prismaMock.paper.findUnique.mockResolvedValue({ title: "P" } as any);
    mockSendEmail.mockRejectedValue(new Error("fail"));

    await expect(
      notifyBountyPayout("r-1", "p-1", 1000, true),
    ).resolves.not.toThrow();
  });
});

// -----------------------------------------------------------------------
// notifyCoAuthorInvitation
// -----------------------------------------------------------------------
describe("notifyCoAuthorInvitation", () => {
  it("should notify invitee about co-author invitation", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Invitee",
      email: "invitee@example.com",
      notifyInvitations: true,
    } as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Collab Paper",
    } as any);

    await notifyCoAuthorInvitation("invitee-1", "paper-1", "Inviter Name");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "invitee@example.com",
        headers: expect.objectContaining({
          "List-Unsubscribe": expect.any(String),
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }),
      }),
    );
  });

  it("should skip when notifyInvitations is disabled", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Invitee",
      email: "invitee@example.com",
      notifyInvitations: false,
    } as any);
    prismaMock.paper.findUnique.mockResolvedValue({ title: "Paper" } as any);

    await notifyCoAuthorInvitation("invitee-1", "paper-1", "Inviter");

    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// notifyCoAuthorResponse
// -----------------------------------------------------------------------
describe("notifyCoAuthorResponse", () => {
  it("should notify inviter about accepted response", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Inviter",
      email: "inviter@example.com",
      notifyInvitations: true,
    } as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Collab Paper",
    } as any);

    await notifyCoAuthorResponse("inviter-1", "paper-1", "Invitee Name", true);

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "inviter@example.com",
        subject: "Invitee Name accepted your co-author invitation",
      }),
    );
  });

  it("should skip when notifyInvitations is disabled", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Inviter",
      email: "inviter@example.com",
      notifyInvitations: false,
    } as any);
    prismaMock.paper.findUnique.mockResolvedValue({ title: "Paper" } as any);

    await notifyCoAuthorResponse("inviter-1", "paper-1", "Invitee", false);

    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------
// Unsubscribe headers integration
// -----------------------------------------------------------------------
describe("unsubscribe headers", () => {
  it("should pass List-Unsubscribe headers on review notifications", async () => {
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Test Paper",
      authors: [
        {
          user: {
            id: "author-1",
            name: "Author",
            email: "author@example.com",
            notifyReviews: true,
            unsubscribeToken: "existing-token",
          },
        },
      ],
    } as any);

    await notifyReviewReceived("paper-1", "Reviewer", "SOUND");

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          "List-Unsubscribe": expect.stringContaining("unsubscribe"),
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }),
      }),
    );
  });

  it("should pass List-Unsubscribe headers on bounty notifications", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      name: "Reviewer",
      email: "reviewer@example.com",
      notifyBounty: true,
      unsubscribeToken: "tok",
    } as any);
    prismaMock.paper.findUnique.mockResolvedValue({
      title: "Paper",
    } as any);

    await notifyBountyPayout("reviewer-1", "paper-1", 1000, false);

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          "List-Unsubscribe": expect.stringContaining("unsubscribe"),
        }),
      }),
    );
  });
});
