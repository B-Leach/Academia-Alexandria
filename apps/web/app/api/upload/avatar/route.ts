import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, deleteFile, extractKeyFromUrl } from "@/lib/s3";
import {
  validateFileUpload,
  validateMagicBytes,
  ALLOWED_IMAGE_TYPES,
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

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  // Validate file
  const validation = validateFileUpload(
    file,
    ALLOWED_IMAGE_TYPES,
    UPLOAD_LIMITS.AVATAR_MAX,
  );
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Get current avatar for cleanup
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  // Validate magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const magicCheck = validateMagicBytes(arrayBuffer, file.type);
  if (!magicCheck.valid) {
    return NextResponse.json({ error: magicCheck.error }, { status: 400 });
  }

  // Upload to S3
  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "jpg";
  const key = `avatars/${session.user.id}/${timestamp}.${ext}`;

  const buffer = Buffer.from(arrayBuffer);
  const url = await uploadFile(key, buffer, file.type);

  // Clean up old avatar if replacing
  if (user?.avatarUrl) {
    const oldKey = extractKeyFromUrl(user.avatarUrl);
    if (oldKey) await deleteFile(oldKey);
  }

  // Update database
  await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: url },
  });

  return NextResponse.json({ url });
}
