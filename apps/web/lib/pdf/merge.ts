import { PDFDocument } from "pdf-lib";

/**
 * Merges multiple PDFs in order using pdf-lib.
 * Returns the merged PDF as a Uint8Array.
 */
export async function mergePdfs(
  ...pdfBuffers: (Buffer | Uint8Array)[]
): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (const pdfBytes of pdfBuffers) {
    const doc = await PDFDocument.load(pdfBytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  return merged.save();
}
