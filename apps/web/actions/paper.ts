"use server";

import { requireUser, requireVerifiedUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import {
  saveDraftSchema,
  updateDraftSchema,
  publishPaperSchema,
  paperSearchSchema,
} from "@/lib/validators/paper";
import { deleteFile, extractKeyFromUrl } from "@/lib/s3";
import { notifyCoAuthorInvitation } from "@/lib/email-notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rateLimitByIp, rateLimitByUser } from "@/lib/rate-limit";
import { CREDIT_ROLE_IDS } from "@academia-alexandria/shared";
import { checkInternalSimilarity } from "@/lib/similarity";
import { submitPlagiarismCheck } from "@/lib/plagiarism";
import { paperListSelect } from "@/lib/selects";

export interface PaperActionResult {
  error?: string;
  success?: boolean;
  paperId?: string;
}

const PAPERS_PER_PAGE = 12;

export async function createPaper(
  formData: FormData,
): Promise<PaperActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const keywords = ((formData.get("keywords") as string) || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const disciplines = formData.getAll("disciplines") as string[];

  const coAuthorIds = (formData.getAll("coAuthorIds") as string[])
    .map((e) => e.trim())
    .filter(Boolean);

  const raw = {
    title: formData.get("title") as string,
    abstract: formData.get("abstract") as string,
    content: formData.get("content") as string,
    disciplines,
    keywords,
    license: (formData.get("license") as string) || "",
    funding: (formData.get("funding") as string) || "",
    dataAvailability: (formData.get("dataAvailability") as string) || "",
    competingInterests: (formData.get("competingInterests") as string) || "",
    ethicsStatement: (formData.get("ethicsStatement") as string) || "",
    coAuthorIds,
  };

  const parsed = saveDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { title, abstract, content, coAuthorIds: authorIds } = parsed.data;

  let coAuthors: { id: string }[] = [];
  if (authorIds.length > 0) {
    const filteredIds = authorIds.filter((id) => id !== userId);
    if (filteredIds.length !== authorIds.length) {
      return { error: "You cannot add yourself as a co-author" };
    }
    coAuthors = await db.user.findMany({
      where: { id: { in: filteredIds } },
      select: { id: true },
    });
    if (coAuthors.length !== filteredIds.length) {
      return {
        error: "One or more co-authors could not be found",
      };
    }
  }

  const paper = await db.paper.create({
    data: {
      title,
      abstract,
      content: content || undefined,
      disciplines: parsed.data.disciplines,
      keywords: parsed.data.keywords,
      license: parsed.data.license && parsed.data.license !== "none" ? parsed.data.license : null,
      funding: parsed.data.funding || null,
      dataAvailability: parsed.data.dataAvailability || null,
      competingInterests: parsed.data.competingInterests || null,
      ethicsStatement: parsed.data.ethicsStatement || null,
      authors: {
        create: [{ userId, order: 0, isCorresponding: true }],
      },
    },
  });

  if (coAuthors.length > 0) {
    await db.coAuthorInvitation.createMany({
      data: coAuthors.map((author, i) => ({
        paperId: paper.id,
        inviterId: userId,
        inviteeId: author.id,
        order: i + 1,
      })),
    });

    const inviter = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    for (const author of coAuthors) {
      notifyCoAuthorInvitation(
        author.id,
        paper.id,
        inviter?.name ?? "A researcher",
      ).catch(() => {});
    }
  }

  revalidatePath("/papers");
  revalidatePath("/dashboard");

  return { success: true, paperId: paper.id };
}

export async function updatePaper(
  paperId: string,
  formData: FormData,
): Promise<PaperActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const authorLink = await db.paperAuthor.findUnique({
    where: { paperId_userId: { paperId, userId } },
  });
  if (!authorLink) {
    return { error: "You are not an author of this paper" };
  }

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      status: true,
      version: true,
      title: true,
      abstract: true,
      content: true,
      pdfUrl: true,
      license: true,
      funding: true,
      dataAvailability: true,
      competingInterests: true,
      ethicsStatement: true,
      keywords: true,
      disciplines: true,
    },
  });
  if (!paper) {
    return { error: "Paper not found" };
  }
  if (paper.status === "RETRACTED") {
    return { error: "Cannot edit a retracted paper" };
  }

  const contentMode = formData.get("contentMode") as string | null;
  const keywords = ((formData.get("keywords") as string) || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const disciplines = formData.getAll("disciplines") as string[];

  const raw: Record<string, unknown> = {};
  const title = formData.get("title") as string;
  const abstract = formData.get("abstract") as string;
  const content = formData.get("content") as string;

  if (title) raw.title = title;
  if (abstract !== null) raw.abstract = abstract;
  if (content !== null) raw.content = content;
  raw.disciplines = disciplines;
  raw.keywords = keywords;
  raw.license = (formData.get("license") as string) || "";
  raw.funding = (formData.get("funding") as string) || "";
  raw.dataAvailability = (formData.get("dataAvailability") as string) || "";
  raw.competingInterests = (formData.get("competingInterests") as string) || "";
  raw.ethicsStatement = (formData.get("ethicsStatement") as string) || "";

  const parsed = updateDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const extraData: Record<string, unknown> = {};

  if (contentMode === "pdf") {
    extraData.content = "";
  } else if (contentMode === "markdown" && paper.pdfUrl) {
    extraData.pdfUrl = null; // Old file preserved for version history
  }

  const updateData = { ...parsed.data, ...extraData };

  if (paper.status === "SUBMITTED" || paper.status === "PUBLISHED") {
    const currentAuthors = await db.paperAuthor.findMany({
      where: { paperId },
      select: {
        userId: true,
        order: true,
        isCorresponding: true,
        user: { select: { name: true } },
      },
      orderBy: { order: "asc" },
    });
    const authorSnapshot = currentAuthors.map((a) => ({
      userId: a.userId,
      name: a.user.name,
      order: a.order,
      isCorresponding: a.isCorresponding,
    }));

    // P2002 = another author concurrently snapshotted this version
    try {
      await db.$transaction(async (tx) => {
        await tx.paperVersion.create({
          data: {
            paperId,
            version: paper.version,
            title: paper.title,
            abstract: paper.abstract,
            content: paper.content,
            pdfUrl: paper.pdfUrl,
            license: paper.license,
            funding: paper.funding,
            dataAvailability: paper.dataAvailability,
            competingInterests: paper.competingInterests,
            ethicsStatement: paper.ethicsStatement,
            keywords: paper.keywords,
            disciplines: paper.disciplines,
            authors: authorSnapshot,
          },
        });
        await tx.paper.update({
          where: { id: paperId },
          data: { ...updateData, version: { increment: 1 } },
        });
      });
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return {
          error:
            "This paper was updated by another author. Please reload and try again.",
        };
      }
      throw err;
    }
  } else {
    await db.paper.update({
      where: { id: paperId },
      data: updateData,
    });
  }

  const rawContributions = (formData.get("contributions") as string) || "";
  const validContributions = rawContributions
    .split(",")
    .map((s) => s.trim())
    .filter((id) => (CREDIT_ROLE_IDS as readonly string[]).includes(id));
  await db.paperAuthor.update({
    where: { paperId_userId: { paperId, userId } },
    data: { contributions: validContributions },
  });

  revalidatePath(`/papers/${paperId}`);
  revalidatePath("/papers");

  return { success: true, paperId };
}

export async function submitPaper(
  paperId: string,
  options?: { isBlindSubmission?: boolean },
): Promise<PaperActionResult> {
  const authResult = await requireVerifiedUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const authorLink = await db.paperAuthor.findUnique({
    where: { paperId_userId: { paperId, userId } },
  });
  if (!authorLink) {
    return { error: "You are not an author of this paper" };
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
    return { error: "Paper not found" };
  }
  if (paper.status === "SUBMITTED" || paper.status === "PUBLISHED") {
    return { error: "Paper has already been submitted" };
  }
  if (paper.status === "RETRACTED") {
    return { error: "Cannot submit a retracted paper" };
  }

  // Block submission while co-author invitations are still pending
  const pendingInvitations = await db.coAuthorInvitation.count({
    where: { paperId, status: "PENDING" },
  });
  if (pendingInvitations > 0) {
    return {
      error: `Cannot submit while ${pendingInvitations} co-author invitation${pendingInvitations > 1 ? "s are" : " is"} still pending. Wait for all invitations to be accepted or declined.`,
    };
  }

  // Validate paper meets submission requirements
  const publishCheck = publishPaperSchema.safeParse({
    title: paper.title,
    abstract: paper.abstract,
    content: paper.content ?? "",
    pdfUrl: paper.pdfUrl ?? "",
    disciplines: paper.disciplines,
    keywords: paper.keywords,
  });
  if (!publishCheck.success) {
    return { error: publishCheck.error.errors[0].message };
  }

  await db.paper.update({
    where: { id: paperId },
    data: {
      status: "SUBMITTED",
      publishedAt: new Date(),
      isBlindSubmission: options?.isBlindSubmission ?? false,
    },
  });

  // Similarity & plagiarism checks (fire-and-forget, don't block submission)
  checkInternalSimilarity(paperId).catch(() => {});
  submitPlagiarismCheck(paperId).catch(() => {});

  revalidatePath(`/papers/${paperId}`);
  revalidatePath("/papers");
  revalidatePath("/dashboard");

  redirect(`/papers/${paperId}/published`);
}

export async function deletePaper(paperId: string): Promise<PaperActionResult> {
  const authResult = await requireUser();
  if (typeof authResult === "string") return { error: authResult };
  const userId = authResult.id;
  const limited = await rateLimitByUser("write", userId);
  if (limited) return limited;

  const authorLink = await db.paperAuthor.findUnique({
    where: { paperId_userId: { paperId, userId } },
    include: { paper: { select: { status: true, pdfUrl: true } } },
  });
  if (!authorLink) {
    return { error: "You are not an author of this paper" };
  }
  if (
    authorLink.paper.status === "PUBLISHED" ||
    authorLink.paper.status === "RETRACTED"
  ) {
    return {
      error:
        "Cannot delete a published or retracted paper. Contact a moderator.",
    };
  }

  // Clean up S3 PDF (best-effort — don't block deletion)
  if (authorLink.paper.pdfUrl) {
    const key = extractKeyFromUrl(authorLink.paper.pdfUrl);
    if (key) await deleteFile(key);
  }

  await db.paper.delete({ where: { id: paperId } });

  revalidatePath("/papers");
  revalidatePath("/dashboard");

  redirect("/papers");
}


function getOrderBy(sort: string) {
  switch (sort) {
    case "oldest":
      return { publishedAt: "asc" as const };
    case "most-viewed":
      return { viewCount: "desc" as const };
    case "most-endorsed":
      return { endorsementCount: "desc" as const };
    case "most-reviewed":
      return { reviewCount: "desc" as const };
    default:
      return { publishedAt: "desc" as const };
  }
}

export async function getPapers(
  searchParams: Record<string, string | undefined>,
) {
  const limited = await rateLimitByIp("read");
  if (limited)
    return { papers: [], totalCount: 0, totalPages: 0, currentPage: 1 };

  const parsed = paperSearchSchema.safeParse(searchParams);
  const { query, discipline, keyword, status, dateFrom, dateTo, sort, page } =
    parsed.success
      ? parsed.data
      : {
          query: "",
          discipline: "",
          keyword: "",
          status: "" as const,
          dateFrom: "",
          dateTo: "",
          sort: "newest" as const,
          page: 1,
        };

  const offset = (page - 1) * PAPERS_PER_PAGE;

  // Path B: Full-text search when query is provided
  if (query.trim()) {
    return searchPapers({
      query: query.trim(),
      discipline,
      keyword,
      status,
      dateFrom,
      dateTo,
      sort,
      page,
      offset,
    });
  }

  // Path A: Browse/filter without query
  const effectiveStatus = status && status !== "all" ? status : undefined;
  const effectiveDiscipline = discipline && discipline !== "all" ? discipline : undefined;

  const where: Record<string, unknown> = {
    status: effectiveStatus ? effectiveStatus : { in: ["SUBMITTED", "PUBLISHED"] },
  };

  if (effectiveDiscipline) {
    where.disciplines = { has: effectiveDiscipline };
  }

  if (keyword) {
    where.keywords = { has: keyword };
  }

  if (dateFrom || dateTo) {
    const publishedAt: Record<string, Date> = {};
    if (dateFrom) publishedAt.gte = new Date(dateFrom);
    if (dateTo) publishedAt.lte = new Date(dateTo + "T23:59:59.999Z");
    where.publishedAt = publishedAt;
  }

  const orderBy = getOrderBy(sort === "relevance" ? "newest" : sort);

  const [papers, totalCount] = await Promise.all([
    db.paper.findMany({
      where,
      orderBy,
      skip: offset,
      take: PAPERS_PER_PAGE,
      select: paperListSelect,
    }),
    db.paper.count({ where }),
  ]);

  return {
    papers,
    totalCount,
    totalPages: Math.ceil(totalCount / PAPERS_PER_PAGE),
    currentPage: page,
  };
}

async function searchPapers({
  query,
  discipline,
  keyword,
  status,
  dateFrom,
  dateTo,
  sort,
  page,
  offset,
}: {
  query: string;
  discipline: string;
  keyword: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  sort: string;
  page: number;
  offset: number;
}) {
  // Build tsquery: split on whitespace, strip non-word chars, join with & for AND
  const terms = query
    .split(/\s+/)
    .map((t) => t.replace(/[^\w]/g, ""))
    .filter(Boolean);

  if (terms.length === 0) {
    return { papers: [], totalCount: 0, totalPages: 0, currentPage: page };
  }

  const tsQuery = terms.join(" & ");

  // Build dynamic WHERE conditions with parameterized placeholders
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Status filter
  if (status && status !== "all") {
    params.push(status);
    conditions.push(`p."status" = $${params.length}::"PaperStatus"`);
  } else {
    conditions.push(`p."status" IN ('SUBMITTED', 'PUBLISHED')`);
  }

  // Full-text match OR author name ILIKE
  params.push(tsQuery);
  const tsQueryIdx = params.length;
  params.push(`%${query}%`);
  const ilikeIdx = params.length;
  conditions.push(
    `(p."search_vector" @@ to_tsquery('english', $${tsQueryIdx}) OR EXISTS (SELECT 1 FROM "paper_authors" pa JOIN "users" u ON u."id" = pa."userId" WHERE pa."paperId" = p."id" AND u."name" ILIKE $${ilikeIdx}))`,
  );

  // Discipline filter
  if (discipline && discipline !== "all") {
    params.push(discipline);
    conditions.push(`$${params.length} = ANY(p."disciplines")`);
  }

  // Keyword filter
  if (keyword) {
    params.push(keyword);
    conditions.push(`$${params.length} = ANY(p."keywords")`);
  }

  // Date range filter
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`p."publishedAt" >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo + "T23:59:59.999Z");
    conditions.push(`p."publishedAt" <= $${params.length}::timestamptz`);
  }

  const whereClause = conditions.join(" AND ");

  // Order clause
  let orderClause: string;
  if (sort === "oldest") {
    orderClause = `p."publishedAt" ASC NULLS LAST`;
  } else if (sort === "most-viewed") {
    orderClause = `p."viewCount" DESC, p."publishedAt" DESC NULLS LAST`;
  } else if (sort === "most-endorsed") {
    orderClause = `p."endorsementCount" DESC, p."publishedAt" DESC NULLS LAST`;
  } else if (sort === "most-reviewed") {
    orderClause = `p."reviewCount" DESC, p."publishedAt" DESC NULLS LAST`;
  } else {
    // "relevance" or "newest" — default to relevance when query is active
    orderClause = `ts_rank(p."search_vector", to_tsquery('english', $${tsQueryIdx})) DESC, p."publishedAt" DESC NULLS LAST`;
  }

  // Parameterize LIMIT and OFFSET for the ID query
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const paginatedParams = [...params, PAPERS_PER_PAGE, offset];

  // Get count and ranked IDs
  const [countResult, paperIds] = await Promise.all([
    db.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "papers" p WHERE ${whereClause}`,
      ...params,
    ),
    db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT p."id" FROM "papers" p WHERE ${whereClause} ORDER BY ${orderClause} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      ...paginatedParams,
    ),
  ]);

  const totalCount = Number(countResult[0].count);

  if (paperIds.length === 0) {
    return { papers: [], totalCount: 0, totalPages: 0, currentPage: page };
  }

  // Fetch full paper data via Prisma for type safety and relation loading
  const ids = paperIds.map((r) => r.id);
  const papers = await db.paper.findMany({
    where: { id: { in: ids } },
    select: paperListSelect,
  });

  // Preserve rank order from raw query
  const orderMap = new Map(ids.map((id, i) => [id, i]));
  papers.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return {
    papers,
    totalCount,
    totalPages: Math.ceil(totalCount / PAPERS_PER_PAGE),
    currentPage: page,
  };
}

export async function getPaper(paperId: string) {
  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      id: true,
      title: true,
      abstract: true,
      content: true,
      status: true,
      disciplines: true,
      keywords: true,
      pdfUrl: true,
      license: true,
      funding: true,
      dataAvailability: true,
      competingInterests: true,
      ethicsStatement: true,
      doi: true,
      version: true,
      isBlindSubmission: true,
      acceptanceEligibleAt: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      commentCount: true,
      reviewCount: true,
      endorsementCount: true,
      viewCount: true,
      downloadCount: true,
      retractedAt: true,
      retractedReason: true,
      retractedBy: { select: { name: true } },
      authors: {
        select: {
          userId: true,
          order: true,
          isCorresponding: true,
          contributions: true,
          user: {
            select: {
              id: true,
              name: true,
              honorific: true,
              institution: true,
              orcidId: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  return paper;
}

export async function getPaperVersionHistory(paperId: string) {
  return db.paperVersion.findMany({
    where: { paperId },
    select: { version: true, title: true, createdAt: true },
    orderBy: { version: "desc" },
  });
}

export async function getPaperVersion(paperId: string, version: number) {
  return db.paperVersion.findUnique({
    where: { paperId_version: { paperId, version } },
  });
}

export async function getReferences(paperId: string) {
  return db.reference.findMany({
    where: { paperId },
    select: {
      id: true,
      title: true,
      authors: true,
      year: true,
      doi: true,
      url: true,
      journal: true,
      citedPaperId: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getCitedBy(paperId: string) {
  return db.reference.findMany({
    where: { citedPaperId: paperId },
    select: {
      id: true,
      paper: {
        select: {
          id: true,
          title: true,
          status: true,
          publishedAt: true,
        },
      },
    },
  });
}

export async function saveReferences(
  paperId: string,
  bibtex: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  const user = await requireUser();
  if (typeof user === "string") return { success: false, count: 0, error: user };
  const limited = await rateLimitByUser("write", user.id);
  if (limited) return { success: false, count: 0, error: limited.error };

  const authorLink = await db.paperAuthor.findUnique({
    where: { paperId_userId: { paperId, userId: user.id } },
  });
  if (!authorLink) {
    return { success: false, count: 0, error: "Not an author of this paper" };
  }

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { status: true },
  });
  if (!paper || (paper.status !== "DRAFT" && paper.status !== "SUBMITTED")) {
    return { success: false, count: 0, error: "Paper cannot be edited" };
  }

  const { parseBibtexString } = await import("@/lib/bibtex-parser");
  const parsed = await parseBibtexString(bibtex, { linkToPlatform: true });

  if (parsed.length === 0) {
    return { success: false, count: 0, error: "No valid BibTeX entries found" };
  }

  await db.$transaction([
    db.reference.deleteMany({ where: { paperId } }),
    ...parsed.map((ref, i) =>
      db.reference.create({
        data: {
          paperId,
          raw: ref.raw,
          title: ref.title,
          authors: ref.authors,
          year: ref.year,
          doi: ref.doi,
          url: ref.url,
          journal: ref.journal,
          citedPaperId: ref.citedPaperId,
          sortOrder: i,
        },
      }),
    ),
  ]);

  revalidatePath(`/papers/${paperId}`);
  return { success: true, count: parsed.length };
}
