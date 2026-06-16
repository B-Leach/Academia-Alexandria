import { describe, it, expect } from "vitest";
import { getAcceptanceReputationPoints } from "@/lib/reputation-logic";
import { REPUTATION_POINTS } from "@academia-alexandria/shared";

describe("getAcceptanceReputationPoints", () => {
  it("should return PAPER_ACCEPTED_HIGH (15) for avgRep >= 500", () => {
    expect(getAcceptanceReputationPoints(1000)).toBe(REPUTATION_POINTS.PAPER_ACCEPTED_HIGH);
  });

  it("should return PAPER_ACCEPTED_HIGH (15) for avgRep exactly 500 (boundary)", () => {
    expect(getAcceptanceReputationPoints(500)).toBe(REPUTATION_POINTS.PAPER_ACCEPTED_HIGH);
  });

  it("should return PAPER_ACCEPTED_MID (10) for avgRep 100-499", () => {
    expect(getAcceptanceReputationPoints(250)).toBe(REPUTATION_POINTS.PAPER_ACCEPTED_MID);
  });

  it("should return PAPER_ACCEPTED_MID (10) for avgRep exactly 100 (boundary)", () => {
    expect(getAcceptanceReputationPoints(100)).toBe(REPUTATION_POINTS.PAPER_ACCEPTED_MID);
  });

  it("should return PAPER_ACCEPTED_MID (10) for avgRep 499 (boundary)", () => {
    expect(getAcceptanceReputationPoints(499)).toBe(REPUTATION_POINTS.PAPER_ACCEPTED_MID);
  });

  it("should return PAPER_ACCEPTED_LOW (5) for avgRep below 100", () => {
    expect(getAcceptanceReputationPoints(50)).toBe(REPUTATION_POINTS.PAPER_ACCEPTED_LOW);
  });

  it("should return PAPER_ACCEPTED_LOW (5) for avgRep 0", () => {
    expect(getAcceptanceReputationPoints(0)).toBe(REPUTATION_POINTS.PAPER_ACCEPTED_LOW);
  });

  it("should return PAPER_ACCEPTED_LOW (5) for avgRep 99 (boundary)", () => {
    expect(getAcceptanceReputationPoints(99)).toBe(REPUTATION_POINTS.PAPER_ACCEPTED_LOW);
  });
});
