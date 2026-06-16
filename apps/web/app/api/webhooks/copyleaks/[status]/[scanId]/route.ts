import crypto from "node:crypto";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.COPYLEAKS_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

interface CopyleaksCompletedPayload {
  scannedDocument: {
    scanId: string;
    totalWords: number;
  };
  results: {
    score: {
      identicalWords: number;
      minorChangedWords: number;
      relatedMeaningWords: number;
      aggregatedScore: number;
    };
  };
}

interface CopyleaksErrorPayload {
  scannedDocument: { scanId: string };
  error: { code: number; message: string };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ status: string; scanId: string }> },
) {
  const rawBody = await request.text();

  // Verify webhook authenticity — fail closed if secret not configured
  if (!process.env.COPYLEAKS_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }
  const signature = request.headers.get("x-copyleaks-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  const { status, scanId } = await params;

  const paper = await db.paper.findUnique({
    where: { id: scanId },
    select: { plagiarismStatus: true, plagiarismCheckId: true },
  });

  if (!paper || paper.plagiarismCheckId !== scanId) {
    return NextResponse.json({ error: "Unknown scan" }, { status: 404 });
  }

  if (paper.plagiarismStatus !== "PENDING") {
    return NextResponse.json({ ok: true });
  }

  if (status === "completed") {
    try {
      const body = JSON.parse(rawBody) as CopyleaksCompletedPayload;
      const score = body.results?.score?.aggregatedScore ?? 0;

      await db.paper.update({
        where: { id: scanId },
        data: {
          plagiarismScore: score,
          plagiarismStatus: "COMPLETE",
        },
      });

      if (score > 30) {
        const paperWithAuthors = await db.paper.findUnique({
          where: { id: scanId },
          select: { authors: { select: { userId: true }, take: 1 } },
        });
        const reporterId = paperWithAuthors?.authors[0]?.userId;
        if (reporterId) {
          await db.report.create({
            data: {
              reporterId,
              targetType: "PAPER",
              targetId: scanId,
              reason: `Automated plagiarism check: ${Math.round(score)}% match detected by external scan. Requires moderator review.`,
            },
          });
        }
      }
    } catch {
      await db.paper.update({
        where: { id: scanId },
        data: { plagiarismStatus: "FAILED" },
      });
    }
  } else if (status === "error") {
    try {
      const body = JSON.parse(rawBody) as CopyleaksErrorPayload;
      console.error(
        `Copyleaks scan error for ${scanId}: ${body.error?.message}`,
      );
    } catch {
      // ignore parse errors
    }
    await db.paper.update({
      where: { id: scanId },
      data: { plagiarismStatus: "FAILED" },
    });
  }

  return NextResponse.json({ ok: true });
}
