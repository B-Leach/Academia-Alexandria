import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyUnsubscribe,
  isValidPrefKey,
  PREF_LABELS,
  type PrefKey,
} from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Shared handler logic
// ---------------------------------------------------------------------------

async function handleUnsubscribe(
  userId: string | null,
  prefKey: string | null,
  sig: string | null,
): Promise<NextResponse> {
  if (!userId || !prefKey || !sig) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  if (!isValidPrefKey(prefKey)) {
    return NextResponse.json(
      { error: "Invalid preference key" },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { unsubscribeToken: true },
  });

  if (!user?.unsubscribeToken) {
    return NextResponse.json(
      { error: "Invalid unsubscribe link" },
      { status: 400 },
    );
  }

  if (!verifyUnsubscribe(userId, prefKey, sig, user.unsubscribeToken)) {
    return NextResponse.json(
      { error: "Invalid unsubscribe link" },
      { status: 400 },
    );
  }

  // Disable the preference
  await db.user.update({
    where: { id: userId },
    data: { [prefKey]: false },
  });

  return new NextResponse(confirmationHtml(prefKey), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ---------------------------------------------------------------------------
// GET — one-click unsubscribe from email link
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  return handleUnsubscribe(
    searchParams.get("user"),
    searchParams.get("pref"),
    searchParams.get("sig"),
  );
}

// ---------------------------------------------------------------------------
// POST — RFC 8058 List-Unsubscribe-Post
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  return handleUnsubscribe(
    searchParams.get("user"),
    searchParams.get("pref"),
    searchParams.get("sig"),
  );
}

// ---------------------------------------------------------------------------
// Confirmation HTML
// ---------------------------------------------------------------------------

function confirmationHtml(prefKey: PrefKey): string {
  const label = PREF_LABELS[prefKey];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed — Academia Alexandria</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #111827; }
    .card { background: white; border-radius: 12px; padding: 48px; max-width: 480px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 1.5rem; margin: 0 0 12px; }
    p { color: #6b7280; line-height: 1.6; margin: 0 0 24px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Unsubscribed</h1>
    <p>You will no longer receive <strong>${label}</strong> notifications from Academia Alexandria.</p>
    <p><a href="/settings">Manage all notification settings</a></p>
  </div>
</body>
</html>`;
}
