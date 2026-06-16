import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkApiRateLimit, checkApiRateLimitByTier, getIpFromRequest } from "@/lib/rate-limit";
import { authenticateApiKey } from "@/lib/api-auth";
import { getLicenseUrl } from "@academia-alexandria/shared";
import { getBaseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

function formatPaper(paper: NonNullable<Awaited<ReturnType<typeof queryPaper>>>) {
  const baseUrl = getBaseUrl();
  const hideAuthors = paper.isBlindSubmission && paper.status === "SUBMITTED";
  return {
    id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    disciplines: paper.disciplines,
    keywords: paper.keywords,
    license: paper.license,
    licenseUrl: paper.license ? getLicenseUrl(paper.license) ?? null : null,
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

async function queryPaper(id: string) {
  return db.paper.findUnique({
    where: { id, status: { in: ["SUBMITTED", "PUBLISHED"] } },
    select: paperSelect,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> },
) {
  const ip = getIpFromRequest(request);
  const rateLimited = await checkApiRateLimit("read", ip);
  if (rateLimited) return rateLimited;

  const { paperId } = await params;

  const paper = await queryPaper(paperId);

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  return NextResponse.json({ data: formatPaper(paper) });
}

export async function PATCH(
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

  const authorLink = await db.paperAuthor.findUnique({
    where: { paperId_userId: { paperId, userId: auth.userId } },
  });
  if (!authorLink) {
    return NextResponse.json({ error: "Not an author of this paper" }, { status: 403 });
  }

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { status: true },
  });
  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }
  if (paper.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft papers can be edited via API" },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.abstract === "string") data.abstract = body.abstract;
  if (typeof body.content === "string") data.content = body.content;
  if (Array.isArray(body.disciplines)) {
    data.disciplines = body.disciplines.filter((d): d is string => typeof d === "string");
  }
  if (Array.isArray(body.keywords)) {
    data.keywords = body.keywords.filter((k): k is string => typeof k === "string");
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await db.paper.update({
    where: { id: paperId },
    data,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return NextResponse.json({ data: updated });
}
