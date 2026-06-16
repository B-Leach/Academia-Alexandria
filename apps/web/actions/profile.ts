"use server";

import { requireUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators/profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rateLimitByUser } from "@/lib/rate-limit";

export interface ProfileActionResult {
  error?: string;
  success?: boolean;
}

export async function getProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      honorific: true,
      email: true,
      bio: true,
      institution: true,
      rorId: true,
      avatarUrl: true,
      orcidId: true,
      reputationScore: true,
      createdAt: true,
      researchAreas: {
        select: {
          researchArea: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      authoredPapers: {
        where: { paper: { status: { in: ["SUBMITTED", "PUBLISHED"] } } },
        select: {
          paper: {
            select: {
              id: true,
              title: true,
              abstract: true,
              status: true,
              disciplines: true,
              publishedAt: true,
              commentCount: true,
              reviewCount: true,
              endorsementCount: true,
            },
          },
        },
        orderBy: { paper: { publishedAt: "desc" } },
      },
    },
  });

  return user;
}

export async function getProfileMetrics(userId: string) {
  const [
    publishedCount,
    submittedCount,
    viewsResult,
    endorsementsReceived,
    reviewsOnPapers,
  ] = await Promise.all([
    db.paperAuthor.count({
      where: { userId, paper: { status: "PUBLISHED" } },
    }),
    db.paperAuthor.count({
      where: { userId, paper: { status: "SUBMITTED" } },
    }),
    db.paper.aggregate({
      where: {
        authors: { some: { userId } },
        status: { in: ["SUBMITTED", "PUBLISHED"] },
      },
      _sum: { viewCount: true },
    }),
    db.endorsement.count({
      where: {
        paper: { authors: { some: { userId } } },
      },
    }),
    db.review.groupBy({
      by: ["recommendation"],
      where: {
        paper: { authors: { some: { userId } } },
      },
      _count: true,
    }),
  ]);

  const reviewBreakdown = {
    sound: 0,
    needsRevision: 0,
    unsound: 0,
  };
  for (const group of reviewsOnPapers) {
    if (group.recommendation === "SOUND") reviewBreakdown.sound = group._count;
    else if (group.recommendation === "NEEDS_REVISION")
      reviewBreakdown.needsRevision = group._count;
    else if (group.recommendation === "UNSOUND")
      reviewBreakdown.unsound = group._count;
  }

  return {
    publishedCount,
    submittedCount,
    totalViews: viewsResult._sum.viewCount ?? 0,
    endorsementsReceived,
    reviewsOnPapers: reviewBreakdown,
  };
}

export async function updateProfile(
  formData: FormData,
): Promise<ProfileActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const raw = {
    name: formData.get("name") as string,
    honorific: (formData.get("honorific") as string) || "",
    bio: formData.get("bio") as string,
    institution: formData.get("institution") as string,
    rorId: (formData.get("rorId") as string) || "",
    researchAreaIds: formData.getAll("researchAreaIds") as string[],
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, honorific, bio, institution, rorId, researchAreaIds } =
    parsed.data;

  // Validate research area IDs exist
  if (researchAreaIds.length > 0) {
    const validCount = await db.researchArea.count({
      where: { id: { in: researchAreaIds } },
    });
    if (validCount !== researchAreaIds.length) {
      return { error: "One or more research areas are invalid" };
    }
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        honorific: honorific && honorific !== "none" ? honorific : null,
        bio,
        institution,
        rorId: rorId || null,
      },
    });

    // Replace research areas
    await tx.userResearchArea.deleteMany({
      where: { userId },
    });

    if (researchAreaIds.length > 0) {
      await tx.userResearchArea.createMany({
        data: researchAreaIds.map((researchAreaId) => ({
          userId,
          researchAreaId,
        })),
      });
    }
  });

  revalidatePath(`/profiles/${userId}`);
  revalidatePath("/settings");

  redirect(`/profiles/${userId}`);
}

export async function disconnectOrcid(): Promise<ProfileActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { orcidId: null },
    });

    await tx.account.deleteMany({
      where: { userId, provider: "orcid" },
    });
  });

  revalidatePath(`/profiles/${userId}`);
  revalidatePath("/settings");

  return { success: true };
}

export async function updateNotificationPreferences(
  formData: FormData,
): Promise<ProfileActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  await db.user.update({
    where: { id: userId },
    data: {
      notifyReviews: formData.get("notifyReviews") === "on",
      notifyComments: formData.get("notifyComments") === "on",
      notifyEndorsements: formData.get("notifyEndorsements") === "on",
      notifyPaperStatus: formData.get("notifyPaperStatus") === "on",
      notifyBounty: formData.get("notifyBounty") === "on",
      notifyInvitations: formData.get("notifyInvitations") === "on",
    },
  });

  revalidatePath("/settings");

  return { success: true };
}
