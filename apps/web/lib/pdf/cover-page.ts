import { getBrowser } from "./browser";
import { escapeHtml } from "@/lib/utils/escape-html";
import { formatDate } from "@/lib/utils";

interface CoverPageData {
  title: string;
  authors: {
    name: string;
    institution: string | null;
    isCorresponding: boolean;
  }[];
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "RETRACTED";
  publishedAt: Date | null;
  doi: string | null;
  paperUrl: string;
  keywords: string[];
  version: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: "Peer Reviewed", color: "#16a34a" },
  SUBMITTED: { label: "Under Review", color: "#2563eb" },
  DRAFT: { label: "Draft", color: "#6b7280" },
  RETRACTED: { label: "Retracted", color: "#dc2626" },
};

function buildCoverHtml(data: CoverPageData): string {
  const status = STATUS_LABELS[data.status] ?? STATUS_LABELS.DRAFT;
  const hasCorresponding = data.authors.some((a) => a.isCorresponding);

  // Group authors by institution for numbered affiliations
  const institutions: string[] = [];
  const authorEntries = data.authors.map((a) => {
    let affIdx: number | undefined;
    if (a.institution) {
      let idx = institutions.indexOf(a.institution);
      if (idx === -1) {
        idx = institutions.length;
        institutions.push(a.institution);
      }
      affIdx = idx + 1;
    }
    return { name: a.name, isCorresponding: a.isCorresponding, affIdx };
  });

  const showNumbers = institutions.length > 1;

  const authorHtml = authorEntries
    .map((a) => {
      let html = `<span class="author-name">${escapeHtml(a.name)}</span>`;
      if (showNumbers && a.affIdx) {
        html += `<sup class="aff-num">${a.affIdx}</sup>`;
      }
      if (a.isCorresponding) {
        html += `<sup class="corr">*</sup>`;
      }
      return html;
    })
    .join('<span class="author-sep">,&nbsp; </span>');

  const affiliationHtml = institutions
    .map((inst, i) => {
      const prefix = showNumbers ? `<sup>${i + 1}</sup> ` : "";
      return `<div class="affiliation">${prefix}${escapeHtml(inst)}</div>`;
    })
    .join("\n");

  const correspondingNote = hasCorresponding
    ? `<div class="corresponding-note">* Corresponding author</div>`
    : "";

  const metaLines: string[] = [];

  metaLines.push(
    `<div class="status" style="color: ${status.color}; border-color: ${status.color}">${status.label}</div>`,
  );

  if (data.publishedAt) {
    metaLines.push(
      `<div class="meta-item">Published ${formatDate(data.publishedAt)}</div>`,
    );
  }

  if (data.doi) {
    metaLines.push(
      `<div class="meta-item"><a href="https://doi.org/${escapeHtml(data.doi)}" class="doi-link">https://doi.org/${escapeHtml(data.doi)}</a></div>`,
    );
  }

  if (data.version > 1) {
    metaLines.push(`<div class="meta-item">Version ${data.version}</div>`);
  }

  const keywordsHtml =
    data.keywords.length > 0
      ? `<div class="keywords"><span class="kw-label">Keywords:</span> ${data.keywords.map((k) => escapeHtml(k)).join(", ")}</div>`
      : "";

  metaLines.push(
    `<div class="meta-item url">${escapeHtml(data.paperUrl)}</div>`,
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: A4; margin: 0; }

    body {
      font-family: "Georgia", "Times New Roman", serif;
      width: 210mm;
      height: 297mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 50px 65px;
      color: #1a1a1a;
      position: relative;
    }

    /* Accent bar at top */
    .accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(to right, #1a4d8f, #2563eb, #1a4d8f);
    }

    .branding {
      text-align: center;
      margin-bottom: 40px;
    }
    .branding h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #1a1a1a;
    }
    .branding .tagline {
      font-size: 11px;
      color: #777;
      margin-top: 4px;
      font-style: italic;
      letter-spacing: 0.05em;
    }

    .divider {
      width: 100%;
      height: 0;
      border-top: 1.5px solid #333;
      border-bottom: 0.5px solid #aaa;
      padding-top: 1px;
      margin: 16px 0 44px 0;
    }

    .title {
      font-size: 26px;
      font-weight: 700;
      text-align: center;
      line-height: 1.3;
      margin-bottom: 24px;
      max-width: 90%;
    }

    .authors-block {
      text-align: center;
      margin-bottom: 6px;
      font-size: 14px;
      line-height: 1.6;
    }
    .author-name { font-weight: 600; }
    .author-sep { color: #666; }
    .aff-num, .corr {
      font-size: 9px;
      color: #666;
    }

    .affiliations {
      text-align: center;
      margin-bottom: 8px;
    }
    .affiliation {
      font-size: 11px;
      font-style: italic;
      color: #555;
      line-height: 1.5;
    }
    .affiliation sup {
      font-size: 8px;
      font-style: normal;
      color: #666;
    }

    .corresponding-note {
      text-align: center;
      font-size: 10px;
      color: #888;
      font-style: italic;
      margin-bottom: 28px;
    }

    .keywords {
      text-align: center;
      font-size: 11px;
      color: #444;
      margin-bottom: 36px;
      max-width: 85%;
    }
    .kw-label {
      font-weight: 700;
      font-style: italic;
    }

    .meta {
      text-align: center;
      margin-top: auto;
      padding-top: 36px;
    }

    .status {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      padding: 5px 18px;
      border: 1.5px solid;
      border-radius: 20px;
      margin-bottom: 12px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .meta-item {
      font-size: 11px;
      color: #555;
      margin-bottom: 4px;
    }

    .doi-link {
      color: #1a4d8f;
      text-decoration: none;
    }

    .meta-item.url {
      font-size: 10px;
      color: #999;
      margin-top: 8px;
      word-break: break-all;
    }

    .footer {
      margin-top: 36px;
      text-align: center;
      font-size: 9px;
      color: #aaa;
      font-style: italic;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="accent-bar"></div>

  <div class="branding">
    <h1>Academia Alexandria</h1>
    <div class="tagline">Open-Access Academic Publishing</div>
  </div>

  <div class="divider"></div>

  <div class="title">${escapeHtml(data.title)}</div>

  <div class="authors-block">
    ${authorHtml}
  </div>

  <div class="affiliations">
    ${affiliationHtml}
  </div>

  ${correspondingNote}

  ${keywordsHtml}

  <div class="meta">
    ${metaLines.join("\n    ")}
  </div>

  <div class="footer">
    This paper was published on Academia Alexandria — an open-access,<br>
    community-driven academic publishing platform.
  </div>
</body>
</html>`;
}

/**
 * Renders a branded cover page as a single-page PDF.
 */
export async function renderCoverPagePdf(data: CoverPageData): Promise<Buffer> {
  const html = buildCoverHtml(data);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Block all network requests to prevent SSRF
    await page.setRequestInterception(true);
    page.on("request", (req) => req.abort());

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}
