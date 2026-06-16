import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "healthy" });
  } catch {
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
