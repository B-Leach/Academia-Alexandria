import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkApiRateLimitByTier } from "@/lib/rate-limit";
import { authenticateApiKey } from "@/lib/api-auth";
import { publishPaperSchema } from "@/lib/validators/paper";
import { checkInternalSimilarity } from "@/lib/similarity";
import { submitPlagiarismCheck } from "@/lib/plagiarism";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> },
) {
  const auth = await authenticateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized — provide a valid API key via Bearer token" },
      { status: 401 },
    );
  }

  const rateLimited = await checkApiRateLimitByTier(auth.userId, auth.tier);
  if (rateLimited) return rateLimited;

  const { paperId } = await params;

  // Verify email
  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return NextResponse.json(
      { error: "Email verification required to submit papers" },
      { status: 403 },
    );
  }

  const authorLink = await db.paperAuthor.findUnique({
    where: { paperId_userId: { paperId, userId: auth.userId } },
  });
  if (!authorLink) {
    return NextResponse.json({ error: "Not an author of this paper" }, { status: 403 });
  }

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      status: true,
      title: true,
      abstract: true,
      content: true,
      pdfUrl: true,
      disciplines: true,
      keywords: true,
    },
  });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }
  if (paper.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft papers can be submitted" },
      { status: 400 },
    );
  }

  // Block submission while co-author invitations are still pending
  const pendingInvitations = await db.coAuthorInvitation.count({
    where: { paperId, status: "PENDING" },
  });
  if (pendingInvitations > 0) {
    return NextResponse.json(
      { error: `Cannot submit while ${pendingInvitations} co-author invitation(s) are still pending` },
      { status: 400 },
    );
  }

  const validation = publishPaperSchema.safeParse({
    title: paper.title,
    abstract: paper.abstract,
    content: paper.content ?? "",
    pdfUrl: paper.pdfUrl ?? "",
    disciplines: paper.disciplines,
    keywords: paper.keywords,
  });

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.errors[0].message },
      { status: 400 },
    );
  }

  const updated = await db.paper.update({
    where: { id: paperId },
    data: {
      status: "SUBMITTED",
      publishedAt: new Date(),
    },
    select: { id: true, status: true, publishedAt: true },
  });

  // Similarity & plagiarism checks (fire-and-forget)
  checkInternalSimilarity(paperId).catch(() => {});
  submitPlagiarismCheck(paperId).catch(() => {});

  return NextResponse.json({ data: updated });
}
