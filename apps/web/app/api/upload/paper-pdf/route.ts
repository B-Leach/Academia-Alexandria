import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile, extractKeyFromUrl } from "@/lib/s3";
import {
  validateFileUpload,
  validateMagicBytes,
  ALLOWED_PDF_TYPES,
  UPLOAD_LIMITS,
} from "@/lib/validators/upload";
import { checkApiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.banned) {
    return NextResponse.json(
      { error: "Your account has been suspended" },
      { status: 403 },
    );
  }
  const limited = await checkApiRateLimit("upload", session.user.id);
  if (limited) return limited;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const paperId = formData.get("paperId") as string | null;

  if (!file || !paperId) {
    return NextResponse.json(
      { error: "Missing file or paperId" },
      { status: 400 },
    );
  }

  // Verify user is an author and paper is editable
  const authorLink = await db.paperAuthor.findUnique({
    where: { paperId_userId: { paperId, userId: session.user.id } },
    include: { paper: { select: { status: true, pdfUrl: true } } },
  });

  if (!authorLink) {
    return NextResponse.json(
      { error: "You are not an author of this paper" },
      { status: 403 },
    );
  }

  if (authorLink.paper.status === "PUBLISHED" || authorLink.paper.status === "RETRACTED") {
    return NextResponse.json(
      { error: "Cannot upload PDF to a published or retracted paper" },
      { status: 400 },
    );
  }

  // Validate file
  const validation = validateFileUpload(
    file,
    ALLOWED_PDF_TYPES,
    UPLOAD_LIMITS.PAPER_PDF_MAX,
  );
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Validate magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const magicCheck = validateMagicBytes(arrayBuffer, file.type);
  if (!magicCheck.valid) {
    return NextResponse.json({ error: magicCheck.error }, { status: 400 });
  }

  // Upload to S3
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `papers/${paperId}/${timestamp}-${safeName}`;

  const buffer = Buffer.from(arrayBuffer);
  const url = await uploadFile(key, buffer, file.type);

  // Clean up old PDF if replacing
  if (authorLink.paper.pdfUrl) {
    const oldKey = extractKeyFromUrl(authorLink.paper.pdfUrl);
    if (oldKey) deleteFile(oldKey).catch(() => {});
  }

  // Update database
  await db.paper.update({
    where: { id: paperId },
    data: { pdfUrl: url },
  });

  return NextResponse.json({ url });
}
