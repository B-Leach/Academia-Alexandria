import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkApiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await checkApiRateLimit("read", session.user.id);
  if (limited) return limited;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await db.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        { bannedAt: null },
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      honorific: true,
      email: true,
      avatarUrl: true,
      institution: true,
    },
    take: 8,
    orderBy: { name: "asc" },
  });

  // Mask emails before returning — keep first char + domain, hide the rest
  const masked = users.map(({ email, ...rest }) => {
    const [local, domain] = email.split("@");
    const hint =
      local.length > 0 ? `${local[0]}***@${domain}` : `***@${domain}`;
    return { ...rest, emailHint: hint };
  });

  return NextResponse.json({ users: masked });
}
