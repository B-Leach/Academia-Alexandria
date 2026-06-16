import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Shared auth guard for server actions.
 * Returns the authenticated user's id, or an error string if
 * the user is not signed in or has been banned.
 */
export async function requireUser(): Promise<{ id: string } | string> {
  const session = await auth();
  if (!session?.user?.id) {
    return "You must be signed in";
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { bannedAt: true },
  });

  if (!user || user.bannedAt) {
    return "Your account has been suspended";
  }

  return { id: session.user.id };
}

/**
 * Shared auth guard that also requires a verified email.
 * Used for actions where email verification is mandatory (reviews, paper submission).
 */
export async function requireVerifiedUser(): Promise<{ id: string } | string> {
  const result = await requireUser();
  if (typeof result === "string") return result;

  const user = await db.user.findUnique({
    where: { id: result.id },
    select: { emailVerified: true },
  });

  if (!user?.emailVerified) {
    return "Please verify your email address before performing this action";
  }

  return result;
}

/**
 * Shared auth guard that also requires a linked ORCID account.
 * Used for actions where ORCID verification is mandatory (reviews).
 */
export async function requireOrcidUser(): Promise<{ id: string } | string> {
  const result = await requireVerifiedUser();
  if (typeof result === "string") return result;

  const user = await db.user.findUnique({
    where: { id: result.id },
    select: { orcidId: true },
  });

  if (!user?.orcidId) {
    return "You must link your ORCID account before reviewing. Go to Settings to connect your ORCID.";
  }

  return result;
}

/**
 * Requires ADMIN or MODERATOR role. Returns the session on success, throws on failure.
 */
export async function requireModerator() {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")
  ) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { bannedAt: true },
  });
  if (!user || user.bannedAt) {
    throw new Error("Your account has been suspended");
  }

  return session;
}

/**
 * Requires ADMIN role. Returns the session on success, throws on failure.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { bannedAt: true },
  });
  if (!user || user.bannedAt) {
    throw new Error("Your account has been suspended");
  }

  return session;
}
