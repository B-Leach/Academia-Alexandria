import { vi, type Mock, beforeAll, afterAll } from "vitest";

// Set the test database URL before anything imports Prisma
process.env.DATABASE_URL =
  "postgresql://alexandria:alexandria@localhost:5432/alexandria_test?schema=public";

// Mock next/cache — revalidatePath and revalidateTag are server-only
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Custom error class to catch redirects in tests
export class RedirectError extends Error {
  public url: string;
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`);
    this.url = url;
  }
}

// Mock next/navigation — redirect throws (by design in Next.js)
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
  notFound: vi.fn(),
}));

// Mock auth — controllable session, but no DB mock
export const mockAuthFn: Mock = vi.fn();
export const mockSignIn: Mock = vi.fn();
export const mockSignOut: Mock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: mockAuthFn,
  signIn: mockSignIn,
  signOut: mockSignOut,
}));

// Mock next-auth (AuthError used by auth actions)
vi.mock("next-auth", () => {
  class AuthError extends Error {
    type: string;
    constructor(type: string) {
      super(type);
      this.type = type;
      this.name = "AuthError";
    }
  }
  return { AuthError };
});

// Prisma lifecycle
import { db } from "@/lib/db";

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});
