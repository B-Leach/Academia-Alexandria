import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanDatabase,
  createTestUser,
  setAuthenticatedAs,
  setUnauthenticated,
  resetCounters,
} from "./helpers";
import { db } from "@/lib/db";

// Mock Stripe
const mockAccountsCreate = vi.fn();
const mockAccountLinksCreate = vi.fn();
const mockAccountsRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: {
    accounts: {
      create: (...args: unknown[]) => mockAccountsCreate(...args),
      retrieve: (...args: unknown[]) => mockAccountsRetrieve(...args),
    },
    accountLinks: {
      create: (...args: unknown[]) => mockAccountLinksCreate(...args),
    },
  },
  isStripeEnabled: () => true,
}));

import { POST } from "@/app/api/stripe/connect/route";
import { GET } from "@/app/api/stripe/connect/status/route";

beforeEach(async () => {
  await cleanDatabase();
  resetCounters();
  mockAccountsCreate.mockReset();
  mockAccountLinksCreate.mockReset();
  mockAccountsRetrieve.mockReset();
});

describe("Stripe Connect Onboarding (POST /api/stripe/connect)", () => {
  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("should create a new Connect account and return onboarding URL", async () => {
    const user = await createTestUser({ name: "New Reviewer" });
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    mockAccountsCreate.mockResolvedValue({ id: "acct_new_123" });
    mockAccountLinksCreate.mockResolvedValue({
      url: "https://connect.stripe.com/setup/test",
    });

    const res = await POST();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.url).toBe("https://connect.stripe.com/setup/test");

    // Verify account was created with Standard type
    expect(mockAccountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "standard" })
    );

    // Verify account ID was saved to user
    const updated = await db.user.findUnique({
      where: { id: user.id },
      select: { stripeConnectAccountId: true },
    });
    expect(updated!.stripeConnectAccountId).toBe("acct_new_123");
  });

  it("should reuse existing Connect account and return new onboarding link", async () => {
    const user = await createTestUser({ name: "Existing Reviewer" });
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: "acct_existing_456" },
    });

    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    mockAccountLinksCreate.mockResolvedValue({
      url: "https://connect.stripe.com/setup/re-onboard",
    });

    const res = await POST();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.url).toBe("https://connect.stripe.com/setup/re-onboard");

    // Should NOT create a new account
    expect(mockAccountsCreate).not.toHaveBeenCalled();

    // Should create account link with existing account ID
    expect(mockAccountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({ account: "acct_existing_456" })
    );
  });
});

describe("Stripe Connect Status (GET /api/stripe/connect/status)", () => {
  it("should return 401 when not authenticated", async () => {
    setUnauthenticated();

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("should return connected: false when user has no Connect account", async () => {
    const user = await createTestUser({ name: "No Stripe" });
    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.connected).toBe(false);
  });

  it("should return full status when user has Connect account", async () => {
    const user = await createTestUser({ name: "Connected User" });
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: "acct_status_test" },
    });

    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    mockAccountsRetrieve.mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.connected).toBe(true);
    expect(json.chargesEnabled).toBe(true);
    expect(json.payoutsEnabled).toBe(true);
    expect(json.detailsSubmitted).toBe(true);
  });

  it("should return pending status for incomplete account", async () => {
    const user = await createTestUser({ name: "Pending User" });
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: "acct_pending" },
    });

    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    mockAccountsRetrieve.mockResolvedValue({
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    });

    const res = await GET();
    const json = await res.json();

    expect(json.connected).toBe(true);
    expect(json.chargesEnabled).toBe(false);
    expect(json.detailsSubmitted).toBe(false);
  });

  it("should return connected: false when Stripe account retrieval fails", async () => {
    const user = await createTestUser({ name: "Deleted Account" });
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: "acct_deleted" },
    });

    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    mockAccountsRetrieve.mockRejectedValue(new Error("No such account"));

    const res = await GET();
    const json = await res.json();

    expect(json.connected).toBe(false);
  });

  it("should include pending payouts info", async () => {
    const user = await createTestUser({ name: "Payout User" });
    const author = await createTestUser({ name: "Author" });
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: "acct_payouts" },
    });

    setAuthenticatedAs({ id: user.id, name: user.name!, email: user.email! });

    // Create a paper with bounty and pending payout
    const paper = await db.paper.create({
      data: {
        title: "Test Paper",
        abstract: "Test abstract for the paper being tested.",
        content: "Test content for the paper.",
        disciplines: ["computer-science"],
        keywords: [],
        status: "SUBMITTED",
        publishedAt: new Date(),
        authors: {
          create: [{ userId: author.id, order: 0, isCorresponding: true }],
        },
      },
    });

    const bounty = await db.bounty.create({
      data: {
        paperId: paper.id,
        totalAmountCents: 5000,
        reviewerPoolCents: 4500,
        platformFeeCents: 500,
        maxReviews: 2,
        status: "ACTIVE",
      },
    });

    await db.bountyPayout.create({
      data: {
        bountyId: bounty.id,
        recipientUserId: user.id,
        amountCents: 2125,
        stripeTransferId: null,
        paidAt: null,
      },
    });

    mockAccountsRetrieve.mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    });

    const res = await GET();
    const json = await res.json();

    expect(json.pendingPayouts.count).toBe(1);
    expect(json.pendingPayouts.totalCents).toBe(2125);
  });
});
