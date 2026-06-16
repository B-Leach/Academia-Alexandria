import { db } from "@/lib/db";

interface ParsedReference {
  raw: string;
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
  url: string | null;
  journal: string | null;
  citedPaperId: string | null;
}

interface BibtexEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
  raw: string;
}

/**
 * Simple BibTeX parser — extracts entries and their fields.
 * Handles nested braces and quoted values.
 */
function parseBibtexEntries(input: string): BibtexEntry[] {
  const entries: BibtexEntry[] = [];
  const entryRegex = /@(\w+)\s*\{([^,]*),/g;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(input)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();

    // Skip non-entry types like @string, @preamble, @comment
    if (type === "string" || type === "preamble" || type === "comment") continue;

    // Find the matching closing brace
    let depth = 1;
    let pos = match.index + match[0].length;
    const start = match.index;

    while (pos < input.length && depth > 0) {
      if (input[pos] === "{") depth++;
      else if (input[pos] === "}") depth--;
      pos++;
    }

    const entryBody = input.slice(start + match[0].length, pos - 1);
    const raw = input.slice(start, pos);

    // Parse fields from the entry body
    const fields: Record<string, string> = {};
    const fieldRegex = /(\w+)\s*=\s*/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(entryBody)) !== null) {
      const fieldName = fieldMatch[1].toLowerCase();
      let valueStart = fieldMatch.index + fieldMatch[0].length;

      // Skip whitespace
      while (valueStart < entryBody.length && entryBody[valueStart] === " ") {
        valueStart++;
      }

      let value = "";
      if (entryBody[valueStart] === "{") {
        // Brace-delimited value
        let braceDepth = 1;
        let i = valueStart + 1;
        while (i < entryBody.length && braceDepth > 0) {
          if (entryBody[i] === "{") braceDepth++;
          else if (entryBody[i] === "}") braceDepth--;
          if (braceDepth > 0) value += entryBody[i];
          i++;
        }
        fieldRegex.lastIndex = i;
      } else if (entryBody[valueStart] === '"') {
        // Quote-delimited value
        let i = valueStart + 1;
        while (i < entryBody.length && entryBody[i] !== '"') {
          value += entryBody[i];
          i++;
        }
        fieldRegex.lastIndex = i + 1;
      } else {
        // Bare value (number or macro)
        const bareMatch = entryBody.slice(valueStart).match(/^([^\s,}]+)/);
        if (bareMatch) {
          value = bareMatch[1];
          fieldRegex.lastIndex = valueStart + value.length;
        }
      }

      fields[fieldName] = value.trim();
    }

    entries.push({ type, key, fields, raw });
  }

  return entries;
}

/**
 * Parse a BibTeX string into structured references.
 * Optionally resolves DOIs against existing papers on the platform.
 */
export async function parseBibtexString(
  bibtex: string,
  options?: { linkToPlatform?: boolean },
): Promise<ParsedReference[]> {
  const entries = parseBibtexEntries(bibtex);
  const results: ParsedReference[] = [];

  // Build a DOI → paperId lookup if linking is enabled
  let doiMap = new Map<string, string>();
  if (options?.linkToPlatform) {
    const dois = entries
      .map((e) => e.fields.doi)
      .filter((d): d is string => !!d);

    if (dois.length > 0) {
      const papers = await db.paper.findMany({
        where: { doi: { in: dois } },
        select: { id: true, doi: true },
      });
      doiMap = new Map(
        papers
          .filter((p) => p.doi)
          .map((p) => [p.doi!.toLowerCase(), p.id]),
      );
    }
  }

  for (const entry of entries) {
    const title = entry.fields.title ?? "";
    const doi = entry.fields.doi ?? null;
    const url = entry.fields.url ?? null;
    const journal = entry.fields.journal ?? entry.fields.booktitle ?? null;
    const yearStr = entry.fields.year;
    const year = yearStr ? parseInt(yearStr, 10) || null : null;
    const authors = entry.fields.author ?? "";

    const citedPaperId = doi
      ? doiMap.get(doi.toLowerCase()) ?? null
      : null;

    results.push({
      raw: entry.raw,
      title,
      authors,
      year,
      doi,
      url,
      journal,
      citedPaperId,
    });
  }

  return results;
}
