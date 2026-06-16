import { vi, type Mock } from "vitest";

export const defaultSession = {
  user: { id: "user-1", name: "Test User", email: "test@example.com" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

export const mockAuthFn: Mock = vi.fn();
export const mockSignIn: Mock = vi.fn();
export const mockSignOut: Mock = vi.fn();
export const mockRequireUser: Mock = vi.fn();
export const mockRequireVerifiedUser: Mock = vi.fn();
export const mockRequireOrcidUser: Mock = vi.fn();
export const mockRequireModerator: Mock = vi.fn();
export const mockRequireAdmin: Mock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: mockAuthFn,
  signIn: mockSignIn,
  signOut: mockSignOut,
}));

vi.mock("@/lib/require-user", () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
  requireVerifiedUser: (...args: unknown[]) => mockRequireVerifiedUser(...args),
  requireOrcidUser: (...args: unknown[]) => mockRequireOrcidUser(...args),
  requireModerator: (...args: unknown[]) => mockRequireModerator(...args),
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

export function setAuthenticated(
  session:
    | (typeof defaultSession & { user: { role?: string } })
    | null = defaultSession,
) {
  mockAuthFn.mockResolvedValue(session);
  if (session?.user?.id) {
    mockRequireUser.mockResolvedValue({ id: session.user.id });
    mockRequireVerifiedUser.mockResolvedValue({ id: session.user.id });
    mockRequireOrcidUser.mockResolvedValue({ id: session.user.id });
  } else {
    mockRequireUser.mockResolvedValue("You must be signed in");
    mockRequireVerifiedUser.mockResolvedValue("You must be signed in");
    mockRequireOrcidUser.mockResolvedValue("You must be signed in");
  }

  const role = (session?.user as any)?.role ?? "USER";
  if (session?.user?.id && (role === "ADMIN" || role === "MODERATOR")) {
    mockRequireModerator.mockResolvedValue(session);
  } else {
    mockRequireModerator.mockRejectedValue(new Error("Unauthorized"));
  }

  if (session?.user?.id && role === "ADMIN") {
    mockRequireAdmin.mockResolvedValue(session);
  } else {
    mockRequireAdmin.mockRejectedValue(new Error("Unauthorized"));
  }
}

export function setUnverified(userId = "user-1") {
  mockRequireVerifiedUser.mockResolvedValue(
    "Please verify your email address before performing this action",
  );
  mockRequireOrcidUser.mockResolvedValue(
    "Please verify your email address before performing this action",
  );
  mockRequireUser.mockResolvedValue({ id: userId });
}

export function setNoOrcid(userId = "user-1") {
  mockRequireOrcidUser.mockResolvedValue(
    "You must link your ORCID account before reviewing. Go to Settings to connect your ORCID.",
  );
  mockRequireUser.mockResolvedValue({ id: userId });
  mockRequireVerifiedUser.mockResolvedValue({ id: userId });
}

export function setUnauthenticated() {
  mockAuthFn.mockResolvedValue(null);
  mockRequireUser.mockResolvedValue("You must be signed in");
  mockRequireVerifiedUser.mockResolvedValue("You must be signed in");
  mockRequireOrcidUser.mockResolvedValue("You must be signed in");
  mockRequireModerator.mockRejectedValue(new Error("Unauthorized"));
  mockRequireAdmin.mockRejectedValue(new Error("Unauthorized"));
}
