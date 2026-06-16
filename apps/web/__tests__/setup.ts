import { vi, beforeEach } from "vitest";
import { resetAllLimiters } from "@/lib/rate-limit";

// Mock next/cache — revalidatePath and revalidateTag are server-only
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock next/headers — used by rate limiter for IP extraction
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers({ "x-forwarded-for": "127.0.0.1" })),
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

// Reset rate limiter state between tests to prevent leaking
beforeEach(() => {
  resetAllLimiters();
});
