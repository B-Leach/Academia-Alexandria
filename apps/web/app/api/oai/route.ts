import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLicenseLabel } from "@academia-alexandria/shared";
import { checkApiRateLimit, getIpFromRequest } from "@/lib/rate-limit";
import { escapeXml } from "@/lib/utils/escape-html";
import { getBaseUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RECORDS_PER_PAGE = 100;
const REPOSITORY_NAME = "Academia Alexandria";
const BASE_IDENTIFIER = "oai:academiaalexandria.org";
const ADMIN_EMAIL = "admin@academiaalexandria.org";

function xmlHeader() {
  return `<?xml version="1.0" encoding="UTF-8"?>`;
}

function oaiEnvelope(verb: string, content: string, requestUrl: string) {
  const responseDate = new Date().toISOString();
  return `${xmlHeader()}
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request verb="${verb}">${escapeXml(requestUrl)}</request>
  ${content}
</OAI-PMH>`;
}

function oaiError(code: string, message: string) {
  return `<error code="${code}">${escapeXml(message)}</error>`;
}

function dcRecord(
  paper: {
    id: string;
    title: string;
    abstract: string;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    disciplines: string[];
    keywords: string[];
    license: string | null;
    doi: string | null;
    authors: { user: { name: string } }[];
  },
  baseUrl: string,
) {
  const datestamp = (paper.publishedAt ?? paper.createdAt)
    .toISOString()
    .split("T")[0];
  const identifier = `${BASE_IDENTIFIER}:${paper.id}`;

  const creators = paper.authors
    .map((a) => `      <dc:creator>${escapeXml(a.user.name)}</dc:creator>`)
    .join("\n");

  const subjects = [...paper.disciplines, ...paper.keywords]
    .map((s) => `      <dc:subject>${escapeXml(s)}</dc:subject>`)
    .join("\n");

  const identifiers = [
    `      <dc:identifier>${escapeXml(`${baseUrl}/papers/${paper.id}`)}</dc:identifier>`,
  ];
  if (paper.doi) {
    identifiers.push(
      `      <dc:identifier>doi:${escapeXml(paper.doi)}</dc:identifier>`,
    );
  }

  const rights = paper.license
    ? `      <dc:rights>${escapeXml(getLicenseLabel(paper.license) ?? paper.license)}</dc:rights>`
    : "";

  return `    <record>
      <header>
        <identifier>${identifier}</identifier>
        <datestamp>${datestamp}</datestamp>
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                    xmlns:dc="http://purl.org/dc/elements/1.1/"
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
      <dc:title>${escapeXml(paper.title)}</dc:title>
${creators}
${subjects}
      <dc:description>${escapeXml(paper.abstract)}</dc:description>
      <dc:date>${datestamp}</dc:date>
      <dc:type>article</dc:type>
${identifiers.join("\n")}
${rights}
        </oai_dc:dc>
      </metadata>
    </record>`;
}

async function getPaperSelect() {
  return {
    id: true,
    title: true,
    abstract: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
    disciplines: true,
    keywords: true,
    license: true,
    doi: true,
    authors: {
      select: { user: { select: { name: true } } },
      orderBy: { order: "asc" as const },
    },
  };
}

export async function GET(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const rateLimited = await checkApiRateLimit("read", ip);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const verb = searchParams.get("verb");
  const baseUrl = getBaseUrl();
  const requestUrl = `${baseUrl}/api/oai`;

  if (!verb) {
    return xmlResponse(
      oaiEnvelope("", oaiError("badVerb", "Missing verb parameter"), requestUrl),
    );
  }

  switch (verb) {
    case "Identify":
      return xmlResponse(oaiEnvelope(verb, await handleIdentify(baseUrl), requestUrl));

    case "ListMetadataFormats":
      return xmlResponse(oaiEnvelope(verb, handleListMetadataFormats(), requestUrl));

    case "ListSets":
      return xmlResponse(oaiEnvelope(verb, await handleListSets(), requestUrl));

    case "ListIdentifiers":
      return xmlResponse(
        oaiEnvelope(verb, await handleListIdentifiers(searchParams), requestUrl),
      );

    case "ListRecords":
      return xmlResponse(
        oaiEnvelope(verb, await handleListRecords(searchParams, baseUrl), requestUrl),
      );

    case "GetRecord":
      return xmlResponse(
        oaiEnvelope(verb, await handleGetRecord(searchParams, baseUrl), requestUrl),
      );

    default:
      return xmlResponse(
        oaiEnvelope(verb, oaiError("badVerb", `Unknown verb: ${verb}`), requestUrl),
      );
  }
}

function xmlResponse(xml: string) {
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

async function handleIdentify(baseUrl: string) {
  const earliest = await db.paper.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "asc" },
    select: { publishedAt: true, createdAt: true },
  });

  const earliestDate = (earliest?.publishedAt ?? earliest?.createdAt ?? new Date())
    .toISOString()
    .split("T")[0];

  return `<Identify>
    <repositoryName>${REPOSITORY_NAME}</repositoryName>
    <baseURL>${escapeXml(baseUrl)}/api/oai</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>${ADMIN_EMAIL}</adminEmail>
    <earliestDatestamp>${earliestDate}</earliestDatestamp>
    <deletedRecord>no</deletedRecord>
    <granularity>YYYY-MM-DD</granularity>
  </Identify>`;
}

function handleListMetadataFormats() {
  return `<ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>oai_dc</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>`;
}

async function handleListSets() {
  const disciplines = await db.paper.findMany({
    where: { status: "PUBLISHED" },
    select: { disciplines: true },
  });

  const uniqueDisciplines = [
    ...new Set(disciplines.flatMap((p) => p.disciplines)),
  ].sort();

  const sets = uniqueDisciplines
    .map(
      (d) =>
        `    <set>
      <setSpec>${escapeXml(d)}</setSpec>
      <setName>${escapeXml(d)}</setName>
    </set>`,
    )
    .join("\n");

  return `<ListSets>\n${sets}\n  </ListSets>`;
}

function applyOaiDateFilters(
  where: Record<string, unknown>,
  searchParams: URLSearchParams,
) {
  const from = searchParams.get("from");
  const until = searchParams.get("until");

  if (from || until) {
    const publishedAt: Record<string, Date> = {};
    if (from) publishedAt.gte = new Date(from);
    if (until) publishedAt.lte = new Date(until + "T23:59:59.999Z");
    where.publishedAt = publishedAt;
  }
}

async function handleListIdentifiers(searchParams: URLSearchParams) {
  const metadataPrefix = searchParams.get("metadataPrefix");
  if (metadataPrefix && metadataPrefix !== "oai_dc") {
    return oaiError("cannotDisseminateFormat", "Only oai_dc is supported");
  }

  const cursor = searchParams.get("resumptionToken") || undefined;
  const set = searchParams.get("set") || undefined;

  const where: Record<string, unknown> = { status: "PUBLISHED" as const };
  if (set) where.disciplines = { has: set };
  if (cursor) where.id = { gt: cursor };
  applyOaiDateFilters(where, searchParams);

  const papers = await db.paper.findMany({
    where,
    select: {
      id: true,
      publishedAt: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
    take: RECORDS_PER_PAGE + 1,
  });

  const hasMore = papers.length > RECORDS_PER_PAGE;
  const page = papers.slice(0, RECORDS_PER_PAGE);

  if (page.length === 0) {
    return oaiError("noRecordsMatch", "No records match the request");
  }

  const headers = page
    .map((p) => {
      const datestamp = (p.publishedAt ?? p.createdAt)
        .toISOString()
        .split("T")[0];
      return `    <header>
      <identifier>${BASE_IDENTIFIER}:${p.id}</identifier>
      <datestamp>${datestamp}</datestamp>
    </header>`;
    })
    .join("\n");

  const resumption = hasMore
    ? `\n    <resumptionToken>${page[page.length - 1].id}</resumptionToken>`
    : "";

  return `<ListIdentifiers>\n${headers}${resumption}\n  </ListIdentifiers>`;
}

async function handleListRecords(
  searchParams: URLSearchParams,
  baseUrl: string,
) {
  const metadataPrefix = searchParams.get("metadataPrefix");
  if (metadataPrefix && metadataPrefix !== "oai_dc") {
    return oaiError("cannotDisseminateFormat", "Only oai_dc is supported");
  }

  const cursor = searchParams.get("resumptionToken") || undefined;
  const set = searchParams.get("set") || undefined;

  const where: Record<string, unknown> = { status: "PUBLISHED" as const };
  if (set) where.disciplines = { has: set };
  if (cursor) where.id = { gt: cursor };
  applyOaiDateFilters(where, searchParams);

  const papers = await db.paper.findMany({
    where,
    select: await getPaperSelect(),
    orderBy: { id: "asc" },
    take: RECORDS_PER_PAGE + 1,
  });

  const hasMore = papers.length > RECORDS_PER_PAGE;
  const page = papers.slice(0, RECORDS_PER_PAGE);

  if (page.length === 0) {
    return oaiError("noRecordsMatch", "No records match the request");
  }

  const records = page.map((p) => dcRecord(p, baseUrl)).join("\n");

  const resumption = hasMore
    ? `\n    <resumptionToken>${page[page.length - 1].id}</resumptionToken>`
    : "";

  return `<ListRecords>\n${records}${resumption}\n  </ListRecords>`;
}

async function handleGetRecord(
  searchParams: URLSearchParams,
  baseUrl: string,
) {
  const identifier = searchParams.get("identifier");
  const metadataPrefix = searchParams.get("metadataPrefix");

  if (!identifier) {
    return oaiError("badArgument", "Missing identifier parameter");
  }

  if (metadataPrefix && metadataPrefix !== "oai_dc") {
    return oaiError("cannotDisseminateFormat", "Only oai_dc is supported");
  }

  const paperId = identifier.replace(`${BASE_IDENTIFIER}:`, "");

  const paper = await db.paper.findUnique({
    where: { id: paperId, status: "PUBLISHED" },
    select: await getPaperSelect(),
  });

  if (!paper) {
    return oaiError("idDoesNotExist", "Record not found");
  }

  return `<GetRecord>\n${dcRecord(paper, baseUrl)}\n  </GetRecord>`;
}
