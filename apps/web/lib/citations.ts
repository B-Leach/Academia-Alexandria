export interface CitationAuthor {
  name: string;
  institution?: string | null;
}

export interface CitationData {
  id: string;
  title: string;
  authors: CitationAuthor[];
  abstract: string;
  keywords: string[];
  doi?: string | null;
  publishedAt?: Date | string | null;
  version: number;
  /** Set when citing a specific old version (pins the URL to ?v=N and adds version annotation) */
  pinnedVersion?: number;
  url?: string;
}

export type CitationFormat =
  | "bibtex"
  | "apa"
  | "mla"
  | "chicago"
  | "ris"
  | "csl-json";

// --- Internal helpers ---

const BIBTEX_SPECIAL = /[&%$#_{}~^\\]/g;
const BIBTEX_ESCAPE: Record<string, string> = {
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "{\\textasciitilde}",
  "^": "{\\textasciicircum}",
  "\\": "{\\textbackslash}",
};

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime()) ? null : date;
}

function getYear(d: Date | string | null | undefined): string {
  const date = toDate(d);
  return date ? String(date.getFullYear()) : "n.d.";
}

function getMonth(d: Date | string | null | undefined): string | null {
  const date = toDate(d);
  return date ? MONTHS[date.getMonth()] : null;
}

function escapeLatex(str: string): string {
  return str.replace(BIBTEX_SPECIAL, (ch) => BIBTEX_ESCAPE[ch] ?? ch);
}

/** "Jane A. Smith" → "Smith, Jane A." */
function lastFirst(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.trim();
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  return `${last}, ${rest}`;
}

/** "Jane A. Smith" → "J. A." */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.trim();
  const firstMiddle = parts.slice(0, -1);
  return firstMiddle.map((p) => p[0].toUpperCase() + ".").join(" ");
}

/** "Jane A. Smith" → "Smith" */
function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function generateBibtexKey(data: CitationData): string {
  const firstAuthor = data.authors[0]?.name ?? "unknown";
  const lastName = getLastName(firstAuthor)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const year = getYear(data.publishedAt).replace("n.d.", "nd");
  const idSlice = data.id.slice(0, 8).toLowerCase();
  return `${lastName}${year}_${idSlice}`;
}

function paperUrl(data: CitationData): string {
  const base = data.url ?? `https://academiaalexandria.org/papers/${data.id}`;
  if (data.pinnedVersion) return `${base}?v=${data.pinnedVersion}`;
  return base;
}

// --- Exported formatters ---

export function formatBibtex(data: CitationData): string {
  const key = generateBibtexKey(data);
  const authors = data.authors
    .map((a) => escapeLatex(lastFirst(a.name)))
    .join(" and ");
  const year = getYear(data.publishedAt);
  const month = getMonth(data.publishedAt);

  const fields: string[] = [
    `  title     = {${escapeLatex(data.title)}}`,
    `  author    = {${authors}}`,
    `  journal   = {Academia Alexandria}`,
    `  year      = {${year === "n.d." ? "" : year}}`,
  ];

  if (month) {
    fields.push(`  month     = {${month}}`);
  }

  if (data.doi) {
    fields.push(`  doi       = {${data.doi}}`);
  }

  fields.push(`  url       = {${paperUrl(data)}}`);

  if (data.keywords.length > 0) {
    fields.push(`  keywords  = {${data.keywords.map(escapeLatex).join(", ")}}`);
  }

  fields.push(`  abstract  = {${escapeLatex(data.abstract)}}`);

  if (data.pinnedVersion) {
    fields.push(`  note      = {Version ${data.pinnedVersion}}`);
  }

  return `@article{${key},\n${fields.join(",\n")}\n}`;
}

export function formatApa(data: CitationData): string {
  // APA 7th: Author, A. A., & Author, B. B. (Year). Title. Source. DOI/URL
  const authorList = data.authors.map((a) => {
    const last = getLastName(a.name);
    const initials = getInitials(a.name);
    // Single-name authors (mononymous)
    if (a.name.trim().split(/\s+/).length <= 1) return a.name.trim();
    return `${last}, ${initials}`;
  });

  let authorStr: string;
  if (authorList.length === 1) {
    authorStr = authorList[0];
  } else if (authorList.length === 2) {
    authorStr = `${authorList[0]}, & ${authorList[1]}`;
  } else {
    const allButLast = authorList.slice(0, -1).join(", ");
    authorStr = `${allButLast}, & ${authorList[authorList.length - 1]}`;
  }

  const year = getYear(data.publishedAt);
  const location = data.doi ? `https://doi.org/${data.doi}` : paperUrl(data);

  const versionNote = data.pinnedVersion
    ? ` (Version ${data.pinnedVersion})`
    : "";
  return `${authorStr} (${year}). ${data.title}${versionNote}. Academia Alexandria. ${location}`;
}

export function formatMla(data: CitationData): string {
  // MLA 9th: Last, First, and First Last. "Title." Container, Year, URL.
  const authorList = data.authors.map((a, i) => {
    if (i === 0) return lastFirst(a.name);
    return a.name; // subsequent authors in normal order
  });

  let authorStr: string;
  if (authorList.length === 1) {
    authorStr = authorList[0];
  } else if (authorList.length === 2) {
    authorStr = `${authorList[0]}, and ${authorList[1]}`;
  } else {
    // MLA 9: 3+ authors can use "et al." after first
    authorStr = `${authorList[0]}, et al.`;
  }

  const year = getYear(data.publishedAt);
  const url = data.doi ? `https://doi.org/${data.doi}` : paperUrl(data);
  const yearStr = year === "n.d." ? "" : `, ${year}`;
  const authorEnd = authorStr.endsWith(".") ? "" : ".";
  const versionNote = data.pinnedVersion
    ? `, version ${data.pinnedVersion}`
    : "";

  return `${authorStr}${authorEnd} "${data.title}." Academia Alexandria${versionNote}${yearStr}, ${url}.`;
}

export function formatChicago(data: CitationData): string {
  // Chicago 17th (Notes-Bibliography): Author. "Title." Source, Date. URL.
  const authorList = data.authors.map((a, i) => {
    if (i === 0) return lastFirst(a.name);
    return a.name;
  });

  let authorStr: string;
  if (authorList.length === 1) {
    authorStr = authorList[0];
  } else if (authorList.length === 2) {
    authorStr = `${authorList[0]}, and ${authorList[1]}`;
  } else {
    const allButLast = authorList.slice(0, -1).join(", ");
    authorStr = `${allButLast}, and ${authorList[authorList.length - 1]}`;
  }

  const date = toDate(data.publishedAt);
  let dateStr: string;
  if (date) {
    const monthName = MONTH_NAMES[date.getMonth()];
    dateStr = `${monthName} ${date.getDate()}, ${date.getFullYear()}`;
  } else {
    dateStr = "n.d.";
  }

  const url = data.doi ? `https://doi.org/${data.doi}` : paperUrl(data);
  const authorEnd = authorStr.endsWith(".") ? "" : ".";
  const versionNote = data.pinnedVersion
    ? `, version ${data.pinnedVersion}`
    : "";

  return `${authorStr}${authorEnd} "${data.title}." Academia Alexandria${versionNote}, ${dateStr}. ${url}.`;
}

export function formatRis(data: CitationData): string {
  const lines: string[] = ["TY  - JOUR", `TI  - ${data.title}`];

  for (const author of data.authors) {
    lines.push(`AU  - ${lastFirst(author.name)}`);
  }

  const date = toDate(data.publishedAt);
  if (date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    lines.push(`PY  - ${y}/${m}/${d}/`);
    lines.push(`DA  - ${y}/${m}/${d}/`);
  }

  lines.push(`AB  - ${data.abstract}`);
  lines.push("JO  - Academia Alexandria");
  lines.push("PB  - Academia Alexandria");

  if (data.doi) {
    lines.push(`DO  - ${data.doi}`);
  }

  lines.push(`UR  - ${paperUrl(data)}`);

  for (const kw of data.keywords) {
    lines.push(`KW  - ${kw}`);
  }

  if (data.pinnedVersion) {
    lines.push(`N1  - Version ${data.pinnedVersion}`);
  }

  lines.push("ER  - ");
  return lines.join("\r\n");
}

export function formatCslJson(data: CitationData): string {
  const date = toDate(data.publishedAt);
  const authors = data.authors.map((a) => {
    const parts = a.name.trim().split(/\s+/);
    if (parts.length <= 1) {
      return { family: a.name.trim() };
    }
    const family = parts[parts.length - 1];
    const given = parts.slice(0, -1).join(" ");
    return { family, given };
  });

  const csl: Record<string, unknown> = {
    type: "article-journal",
    id: data.id,
    title: data.title,
    author: authors,
    "container-title": "Academia Alexandria",
    publisher: "Academia Alexandria",
    URL: paperUrl(data),
    abstract: data.abstract,
  };

  if (date) {
    csl.issued = {
      "date-parts": [[date.getFullYear(), date.getMonth() + 1, date.getDate()]],
    };
  }

  if (data.doi) {
    csl.DOI = data.doi;
  }

  if (data.keywords.length > 0) {
    csl.keyword = data.keywords.join(", ");
  }

  if (data.pinnedVersion) {
    csl.version = String(data.pinnedVersion);
    csl.note = `Version ${data.pinnedVersion}`;
  }

  return JSON.stringify(csl, null, 2);
}

export function formatCitation(
  data: CitationData,
  format: CitationFormat,
): string {
  switch (format) {
    case "bibtex":
      return formatBibtex(data);
    case "apa":
      return formatApa(data);
    case "mla":
      return formatMla(data);
    case "chicago":
      return formatChicago(data);
    case "ris":
      return formatRis(data);
    case "csl-json":
      return formatCslJson(data);
  }
}
