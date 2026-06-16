import { readFileSync } from "fs";
import { join } from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { getBrowser } from "./browser";
import { escapeHtml } from "@/lib/utils/escape-html";
import { formatDate } from "@/lib/utils";

interface PaperMeta {
  title: string;
  authors: {
    name: string;
    institution: string | null;
    isCorresponding: boolean;
  }[];
  keywords: string[];
  doi: string | null;
  publishedAt: Date | null;
}

let katexCss: string;
function getKatexCss(): string {
  if (!katexCss) {
    katexCss = readFileSync(
      join(process.cwd(), "node_modules/katex/dist/katex.min.css"),
      "utf-8",
    );
  }
  return katexCss;
}

async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}

function buildTitleBlockHtml(meta: PaperMeta): string {
  const institutions: string[] = [];
  const hasCorresponding = meta.authors.some((a) => a.isCorresponding);
  const authorEntries = meta.authors.map((a) => {
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
      let html = escapeHtml(a.name);
      if (showNumbers && a.affIdx) {
        html += `<sup>${a.affIdx}</sup>`;
      }
      if (a.isCorresponding) {
        html += `<sup>*</sup>`;
      }
      return html;
    })
    .join(", ");

  const affiliationHtml = institutions
    .map((inst, i) => {
      const prefix = showNumbers ? `<sup>${i + 1}</sup> ` : "";
      return `<div class="affiliation">${prefix}${escapeHtml(inst)}</div>`;
    })
    .join("\n");

  const dateLine = meta.publishedAt
    ? `<div class="date">${formatDate(meta.publishedAt)}</div>`
    : "";

  const correspondingNote = hasCorresponding
    ? `<div class="corresponding-note">* Corresponding author</div>`
    : "";

  return `<div class="title-block">
    <h1 class="paper-title">${escapeHtml(meta.title)}</h1>
    <div class="author-line">${authorHtml}</div>
    <div class="affiliations">${affiliationHtml}</div>
    ${dateLine}
    ${correspondingNote}
  </div>`;
}

function buildAbstractHtml(abstract: string, keywords?: string[]): string {
  const kwHtml =
    keywords && keywords.length > 0
      ? `<div class="keywords"><span class="kw-label">Keywords:</span> ${keywords.map((k) => escapeHtml(k)).join(", ")}</div>`
      : "";

  return `<div class="abstract-block">
    <div class="abstract-label">Abstract</div>
    <p class="abstract-text">${escapeHtml(abstract)}</p>
    ${kwHtml}
  </div>`;
}

function buildDocumentHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${getKatexCss()}

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 100%;
    }

    /* ── Title block ─────────────────────────────── */
    .title-block {
      text-align: center;
      margin-bottom: 1.8em;
      padding-bottom: 1.2em;
      border-bottom: 1px solid #ccc;
    }
    .paper-title {
      font-size: 20pt;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 0.6em;
    }
    .author-line {
      font-size: 11pt;
      margin-bottom: 0.4em;
    }
    .author-line sup {
      font-size: 7pt;
      color: #666;
    }
    .affiliations {
      margin-bottom: 0.3em;
    }
    .affiliation {
      font-size: 9.5pt;
      font-style: italic;
      color: #555;
      line-height: 1.5;
    }
    .affiliation sup {
      font-size: 7pt;
      color: #666;
      font-style: normal;
    }
    .date {
      font-size: 9.5pt;
      color: #666;
      margin-top: 0.3em;
    }
    .corresponding-note {
      font-size: 8.5pt;
      color: #888;
      margin-top: 0.4em;
      font-style: italic;
    }

    /* ── Abstract block ──────────────────────────── */
    .abstract-block {
      margin-bottom: 1.8em;
      padding-bottom: 1.2em;
      border-bottom: 1px solid #ccc;
    }
    .abstract-label {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 0.4em;
    }
    .abstract-text {
      font-size: 10.5pt;
      line-height: 1.5;
      text-align: justify;
      margin-bottom: 0.8em;
      color: #222;
    }
    .keywords {
      font-size: 9.5pt;
      color: #333;
    }
    .kw-label {
      font-weight: 700;
      font-style: italic;
    }

    /* ── Headings ────────────────────────────────── */
    h1, h2, h3, h4, h5, h6 {
      font-weight: 700;
      line-height: 1.3;
      margin-top: 1.8em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }
    h1 { font-size: 16pt; }
    h2 { font-size: 13pt; }
    h3 { font-size: 12pt; }
    h4 { font-size: 11pt; font-style: italic; }
    h5 { font-size: 10.5pt; font-style: italic; }
    h6 { font-size: 10pt; font-style: italic; color: #333; }

    /* ── Paragraphs ──────────────────────────────── */
    p {
      margin-bottom: 0.7em;
      text-align: justify;
      orphans: 3;
      widows: 3;
    }
    /* First-line indent only on consecutive paragraphs */
    p + p {
      text-indent: 1.5em;
    }
    /* Reset indent after non-paragraph elements */
    h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p,
    ul + p, ol + p, pre + p, blockquote + p, table + p,
    .title-block + p, .abstract-block + p, hr + p,
    .katex-display + p {
      text-indent: 0;
    }

    /* ── Links ───────────────────────────────────── */
    a { color: #1a4d8f; text-decoration: underline; }

    /* ── Lists ───────────────────────────────────── */
    ul, ol { margin-bottom: 0.8em; padding-left: 2em; }
    li { margin-bottom: 0.25em; }

    /* ── Blockquotes ─────────────────────────────── */
    blockquote {
      border-left: 3px solid #aaa;
      background: #f9f9f9;
      padding: 0.8em 1em;
      margin: 1em 0;
      color: #444;
      font-style: italic;
      font-size: 10.5pt;
    }
    blockquote p {
      margin-bottom: 0.3em;
      text-indent: 0;
    }

    /* ── Code ────────────────────────────────────── */
    code {
      font-family: "Courier New", Courier, monospace;
      font-size: 9pt;
      background: #f3f4f6;
      padding: 1px 4px;
      border-radius: 2px;
    }
    pre {
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      padding: 10px 14px;
      border-radius: 3px;
      overflow-x: auto;
      margin: 1em 0;
      font-size: 9pt;
      line-height: 1.45;
      page-break-inside: avoid;
    }
    pre code {
      background: none;
      padding: 0;
      border: none;
    }

    /* ── Tables ──────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.2em 0;
      font-size: 10pt;
      page-break-inside: avoid;
    }
    th, td {
      border-top: 1px solid #999;
      border-bottom: 1px solid #999;
      padding: 5pt 8pt;
      text-align: left;
    }
    th {
      border-top: 2px solid #333;
      border-bottom: 1px solid #333;
      font-weight: 700;
      font-size: 9.5pt;
      text-transform: none;
    }
    tr:last-child td {
      border-bottom: 2px solid #333;
    }
    tbody tr:nth-child(even) {
      background: #fafafa;
    }

    /* ── Images ──────────────────────────────────── */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.2em auto;
      page-break-inside: avoid;
    }

    /* ── Horizontal rules ────────────────────────── */
    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 2em 0;
    }

    /* ── Strong / Emphasis ────────────────────────── */
    strong { font-weight: 700; }
    em { font-style: italic; }

    /* ── KaTeX display math spacing ──────────────── */
    .katex-display {
      margin: 1em 0;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

/**
 * Renders a standalone abstract page as a PDF (for uploaded PDF papers).
 */
export async function renderAbstractPdf(abstract: string): Promise<Buffer> {
  const html = buildDocumentHtml(buildAbstractHtml(abstract));

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Block all network requests to prevent SSRF via user-controlled content
    await page.setRequestInterception(true);
    page.on("request", (req) => req.abort());

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "25mm",
        bottom: "25mm",
        left: "25mm",
        right: "25mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Renders markdown content to a PDF buffer via Puppeteer.
 * Includes a title block and abstract as front matter if metadata is provided.
 * Does NOT include a cover page — that is merged separately.
 */
export async function renderMarkdownPdf(
  markdown: string,
  abstract?: string,
  meta?: PaperMeta,
): Promise<Buffer> {
  const bodyHtml = await markdownToHtml(markdown);

  const frontMatter: string[] = [];
  if (meta) {
    frontMatter.push(buildTitleBlockHtml(meta));
  }
  if (abstract) {
    frontMatter.push(buildAbstractHtml(abstract, meta?.keywords));
  }

  const html = buildDocumentHtml(frontMatter.join("\n") + bodyHtml);

  // Truncate title for running header
  const runningTitle = meta
    ? escapeHtml(
        meta.title.length > 60 ? meta.title.slice(0, 57) + "..." : meta.title,
      )
    : "";

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Block all network requests to prevent SSRF via user-controlled content
    await page.setRequestInterception(true);
    page.on("request", (req) => req.abort());

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "28mm",
        bottom: "22mm",
        left: "25mm",
        right: "25mm",
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; padding: 0 25mm; font-size: 8px; font-family: Georgia, 'Times New Roman', serif; color: #aaa; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 0.5px solid #ccc; padding-bottom: 3px;">
          <span style="flex: 1; text-align: left; font-style: italic;">${runningTitle}</span>
          <span style="flex-shrink: 0; text-align: right;">Academia Alexandria</span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 8px; color: #aaa; font-family: Georgia, 'Times New Roman', serif; padding-top: 2px;">
          <span class="pageNumber"></span>
        </div>
      `,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}
