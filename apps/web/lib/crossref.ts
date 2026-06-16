import { db } from "@/lib/db";
import { escapeXml } from "@/lib/utils/escape-html";

export function isDoiEnabled(): boolean {
  return !!(
    process.env.CROSSREF_USERNAME &&
    process.env.CROSSREF_PASSWORD &&
    process.env.CROSSREF_DOI_PREFIX &&
    process.env.CROSSREF_DEPOSITOR_NAME &&
    process.env.CROSSREF_DEPOSITOR_EMAIL
  );
}

function generateDoi(paperId: string): string {
  return `${process.env.CROSSREF_DOI_PREFIX}/aa.${paperId}`;
}

interface PaperForDoi {
  id: string;
  title: string;
  abstract: string;
  publishedAt: Date | null;
  authors: Array<{
    user: { name: string; orcidId: string | null };
    order: number;
    isCorresponding: boolean;
  }>;
}

function buildCrossRefXml(paper: PaperForDoi, doi: string): string {
  const depositorName = escapeXml(process.env.CROSSREF_DEPOSITOR_NAME!);
  const depositorEmail = escapeXml(process.env.CROSSREF_DEPOSITOR_EMAIL!);
  const timestamp = Date.now().toString();
  const pubDate = paper.publishedAt ?? new Date();
  const year = pubDate.getFullYear();
  const month = String(pubDate.getMonth() + 1).padStart(2, "0");
  const day = String(pubDate.getDate()).padStart(2, "0");

  const sortedAuthors = [...paper.authors].sort((a, b) => a.order - b.order);
  const authorXml = sortedAuthors
    .map((a, i) => {
      const nameParts = a.user.name.trim().split(/\s+/);
      const surname = escapeXml(nameParts.pop() ?? "");
      const givenName = escapeXml(nameParts.join(" ") || "");
      const sequence = i === 0 ? "first" : "additional";
      let xml = `<person_name sequence="${sequence}" contributor_role="author">`;
      if (givenName) xml += `<given_name>${givenName}</given_name>`;
      xml += `<surname>${surname}</surname>`;
      if (a.user.orcidId) {
        xml += `<ORCID>https://orcid.org/${escapeXml(a.user.orcidId)}</ORCID>`;
      }
      xml += `</person_name>`;
      return xml;
    })
    .join("\n            ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1"
  xmlns="http://www.crossref.org/schema/5.3.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 http://www.crossref.org/schemas/crossref5.3.1.xsd">
  <head>
    <doi_batch_id>${timestamp}</doi_batch_id>
    <timestamp>${timestamp}</timestamp>
    <depositor>
      <depositor_name>${depositorName}</depositor_name>
      <email_address>${depositorEmail}</email_address>
    </depositor>
    <registrant>Academia Alexandria</registrant>
  </head>
  <body>
    <posted_content type="preprint">
      <contributors>
        ${authorXml}
      </contributors>
      <titles>
        <title>${escapeXml(paper.title)}</title>
      </titles>
      <posted_date>
        <month>${month}</month>
        <day>${day}</day>
        <year>${year}</year>
      </posted_date>
      <doi_data>
        <doi>${escapeXml(doi)}</doi>
        <resource>${escapeXml(`${process.env.AUTH_URL ?? "https://academiaalexandria.org"}/papers/${paper.id}`)}</resource>
      </doi_data>
    </posted_content>
  </body>
</doi_batch>`;
}

async function registerDoi(
  paper: PaperForDoi,
  doi: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isDoiEnabled()) {
    return { success: false, error: "CrossRef not configured" };
  }

  const xml = buildCrossRefXml(paper, doi);
  const formData = new FormData();
  formData.append("operation", "doMDUpload");
  formData.append("login_id", process.env.CROSSREF_USERNAME!);
  formData.append("login_passwd", process.env.CROSSREF_PASSWORD!);
  formData.append(
    "fname",
    new Blob([xml], { type: "application/xml" }),
    "deposit.xml",
  );

  try {
    const response = await fetch(
      "https://doi.crossref.org/servlet/deposit",
      {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `CrossRef responded with ${response.status}: ${text.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `CrossRef request failed: ${message}` };
  }
}

export async function assignDoiToPaper(
  paperId: string,
): Promise<{ success: boolean; doi?: string; error?: string }> {
  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      id: true,
      title: true,
      abstract: true,
      doi: true,
      publishedAt: true,
      authors: {
        select: {
          user: { select: { name: true, orcidId: true } },
          order: true,
          isCorresponding: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!paper) return { success: false, error: "Paper not found" };
  if (paper.doi) return { success: true, doi: paper.doi };

  const doi = generateDoi(paperId);

  // Register with CrossRef if configured
  if (isDoiEnabled()) {
    const result = await registerDoi(paper, doi);
    if (!result.success) {
      console.error(`DOI registration failed for paper ${paperId}:`, result.error);
      // Still assign the DOI locally even if CrossRef deposit fails
    }
  }

  // Save DOI to database
  await db.paper.update({
    where: { id: paperId },
    data: { doi },
  });

  return { success: true, doi };
}
