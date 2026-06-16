import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFileBuffer, extractKeyFromUrl } from "@/lib/s3";
import { renderCoverPagePdf } from "@/lib/pdf/cover-page";
import { renderMarkdownPdf } from "@/lib/pdf/markdown-to-pdf";
import { mergePdfs } from "@/lib/pdf/merge";
import { checkApiRateLimit, getIpFromRequest } from "@/lib/rate-limit";
import { displayName, getBaseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paperId: string }> },
) {
  const ip = getIpFromRequest(_request);
  const limited = await checkApiRateLimit("read", ip);
  if (limited) return limited;

  const { paperId } = await params;

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      id: true,
      title: true,
      abstract: true,
      content: true,
      pdfUrl: true,
      status: true,
      keywords: true,
      doi: true,
      publishedAt: true,
      version: true,
      authors: {
        select: {
          isCorresponding: true,
          order: true,
          user: { select: { name: true, honorific: true, institution: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  // Drafts are only downloadable by authors
  if (paper.status === "DRAFT") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAuthor = await db.paperAuthor.findUnique({
      where: {
        paperId_userId: { paperId: paper.id, userId: session.user.id },
      },
    });
    if (!isAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Resolve version: use snapshot if ?v=N requested and valid
  const requestedVersion = _request.nextUrl.searchParams.get("v");
  let displayTitle = paper.title;
  let displayAbstract = paper.abstract;
  let displayContent = paper.content;
  let displayPdfUrl = paper.pdfUrl;
  let displayKeywords = paper.keywords;
  let displayVersion = paper.version;

  if (requestedVersion) {
    const v = parseInt(requestedVersion, 10);
    if (v > 0 && v < paper.version) {
      const snapshot = await db.paperVersion.findUnique({
        where: { paperId_version: { paperId, version: v } },
      });
      if (snapshot) {
        displayTitle = snapshot.title;
        displayAbstract = snapshot.abstract;
        displayContent = snapshot.content;
        displayPdfUrl = snapshot.pdfUrl;
        displayKeywords = snapshot.keywords;
        displayVersion = v;
      }
    }
  }

  const hasContent = displayContent && displayContent.length >= 100;
  const hasPdf = !!displayPdfUrl;

  if (!hasContent && !hasPdf) {
    return NextResponse.json(
      { error: "Paper has no downloadable content" },
      { status: 400 },
    );
  }

  try {
    // Build paper URL for the cover page
    const baseUrl = getBaseUrl();
    const paperUrl = `${baseUrl}/papers/${paper.id}`;

    // Shared author data for cover page and content (authors don't change per version)
    const authors = paper.authors.map((a) => ({
      name: displayName(a.user.name, a.user.honorific),
      institution: a.user.institution,
      isCorresponding: a.isCorresponding,
    }));

    // Render the cover page
    const coverPdf = await renderCoverPagePdf({
      title: displayTitle,
      authors,
      status: paper.status,
      publishedAt: paper.publishedAt,
      doi: paper.doi,
      paperUrl,
      keywords: displayKeywords,
      version: displayVersion,
    });

    // Get the content PDF and build the merge list
    const pdfsToMerge: Buffer[] = [coverPdf];

    if (hasPdf) {
      // Uploaded PDF: serve as-is (abstract is assumed to be in the document already)
      const key = extractKeyFromUrl(displayPdfUrl!);
      if (!key) {
        return NextResponse.json(
          { error: "Could not locate uploaded PDF" },
          { status: 500 },
        );
      }
      pdfsToMerge.push(await getFileBuffer(key));
    } else {
      // Markdown: title block + abstract rendered as front matter
      pdfsToMerge.push(
        await renderMarkdownPdf(displayContent!, displayAbstract ?? undefined, {
          title: displayTitle,
          authors,
          keywords: displayKeywords,
          doi: paper.doi,
          publishedAt: paper.publishedAt,
        }),
      );
    }

    const mergedPdf = await mergePdfs(...pdfsToMerge);

    // Build a filename slug from the title
    const slug = displayTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    // Increment download count (fire-and-forget)
    db.paper
      .update({
        where: { id: paperId },
        data: { downloadCount: { increment: 1 } },
      })
      .catch(() => {});

    return new NextResponse(Buffer.from(mergedPdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${slug}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 },
    );
  }
}
