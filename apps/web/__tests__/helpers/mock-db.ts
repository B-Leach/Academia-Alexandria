import { PrismaClient } from "@academia-alexandria/database";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import { vi, beforeEach } from "vitest";

export const prismaMock = mockDeep<PrismaClient>();

vi.mock("@/lib/db", () => ({
  db: prismaMock,
}));

vi.mock("@academia-alexandria/database", () => ({
  prisma: prismaMock,
}));

beforeEach(() => {
  mockReset(prismaMock);
});

export type MockPrisma = DeepMockProxy<PrismaClient>;
