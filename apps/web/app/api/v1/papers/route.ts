import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkApiRateLimit, checkApiRateLimitByTier, getIpFromRequest } from "@/lib/rate-limit";
import { authenticateApiKey } from "@/lib/api-auth";
import { getLicenseUrl } from "@academia-alexandria/shared";
import { getBaseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const paperSelect = {
  id: true,
  title: true,
  abstract: true,
  status: true,
  isBlindSubmission: true,
  disciplines: true,
  keywords: true,
  license: true,
  funding: true,
  dataAvailability: true,
  doi: true,
  version: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  commentCount: true,
  reviewCount: true,
  endorsementCount: true,
  authors: {
    select: {
      order: true,
      isCorresponding: true,
      contributions: true,
      user: {
        select: {
          name: true,
          orcidId: true,
          institution: true,
          rorId: true,
        },
      },
    },
    orderBy: { order: "asc" as const },
  },
} as const;

type PaperRow = Awaited<
  ReturnType<typeof db.paper.findFirst<{ select: typeof paperSelect }>>
>;

function formatPaper(paper: NonNullable<PaperRow>) {
  const baseUrl = getBaseUrl();
  const hideAuthors = paper.isBlindSubmission && paper.status === "SUBMITTED";
  return {
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    disciplines: paper.disciplines,
    keywords: paper.keywords,
    license: paper.license,
    licenseUrl: paper.license ? (getLicenseUrl(paper.license) ?? null) : null,
    funding: paper.funding,
    dataAvailability: paper.dataAvailability,
    doi: paper.doi,
    version: paper.version,
    publishedAt: paper.publishedAt,
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt,
    commentCount: paper.commentCount,
    reviewCount: paper.reviewCount,
    endorsementCount: paper.endorsementCount,
    url: `${baseUrl}/papers/${paper.id}`,
    isBlindSubmission: paper.isBlindSubmission,
    authors: hideAuthors
      ? []
      : paper.authors.map((a) => ({
          name: a.user.name,
          order: a.order,
          isCorresponding: a.isCorresponding,
          contributions: a.contributions,
          orcidId: a.user.orcidId,
          institution: a.user.institution,
          rorId: a.user.rorId,
        })),
  };
}

export async function GET(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const rateLimited = await checkApiRateLimit("read", ip);
  if (rateLimited) return rateLimited;

  const { searchParams } = request.nextUrl;

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) ||
        DEFAULT_LIMIT,
    ),
  );
  const offset = (page - 1) * limit;

  // Filters
  const discipline = searchParams.get("discipline") || undefined;
  const keyword = searchParams.get("keyword") || undefined;
  const q = searchParams.get("q")?.trim() || undefined;
  const sort = searchParams.get("sort") || "newest";

  const where: Record<string, unknown> = {
    status: { in: ["SUBMITTED", "PUBLISHED"] },
  };

  if (discipline) {
    where.disciplines = { has: discipline };
  }

  if (keyword) {
    where.keywords = { has: keyword };
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { abstract: { contains: q, mode: "insensitive" } },
    ];
  }

  let orderBy: Record<string, string>;
  switch (sort) {
    case "oldest":
      orderBy = { publishedAt: "asc" };
      break;
    case "most-endorsed":
      orderBy = { endorsementCount: "desc" };
      break;
    case "most-reviewed":
      orderBy = { reviewCount: "desc" };
      break;
    default:
      orderBy = { publishedAt: "desc" };
  }

  const [papers, total] = await Promise.all([
    db.paper.findMany({
      where,
      select: paperSelect,
      orderBy,
      skip: offset,
      take: limit,
    }),
    db.paper.count({ where }),
  ]);

  return NextResponse.json({
    data: papers.map(formatPaper),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized — provide a valid API key via Bearer token" },
      { status: 401 },
    );
  }

  const rateLimited = await checkApiRateLimitByTier(auth.userId, auth.tier);
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 },
    );
  }

  const abstract = typeof body.abstract === "string" ? body.abstract : "";
  const content = typeof body.content === "string" ? body.content : null;
  const disciplines = Array.isArray(body.disciplines) ? body.disciplines.filter((d): d is string => typeof d === "string") : [];
  const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k): k is string => typeof k === "string") : [];

  const paper = await db.paper.create({
    data: {
      title,
      abstract,
      content,
      disciplines,
      keywords,
      status: "DRAFT",
      authors: {
        create: {
          userId: auth.userId,
          order: 0,
          isCorresponding: true,
        },
      },
    },
    select: { id: true, title: true, status: true, createdAt: true },
  });

  return NextResponse.json({ data: paper }, { status: 201 });
}
