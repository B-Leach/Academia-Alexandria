import crypto from "crypto";
import { NextResponse } from "next/server";
import { processEligiblePapers } from "@/lib/paper-acceptance";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint to process papers whose cool-off period has elapsed.
 * Protected by CRON_SECRET env var. Should be called periodically
 * (e.g., every hour) by an external scheduler.
 *
 * GET /api/cron/accept-papers?secret=<CRON_SECRET>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  const secretBuf = secret ? Buffer.from(secret) : Buffer.alloc(0);
  const cronBuf = cronSecret ? Buffer.from(cronSecret) : Buffer.alloc(0);
  if (
    !cronSecret ||
    !secret ||
    secretBuf.length !== cronBuf.length ||
    !crypto.timingSafeEqual(secretBuf, cronBuf)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const published = await processEligiblePapers();
    return NextResponse.json({ published });
  } catch (err) {
    console.error("Cron accept-papers error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
