import { db } from "@/lib/db";

const COPYLEAKS_AUTH_URL = "https://id.copyleaks.com/v3/account/login/api";
const COPYLEAKS_API_URL = "https://api.copyleaks.com/v3";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isPlagiarismCheckEnabled(): boolean {
  return !!(process.env.COPYLEAKS_EMAIL && process.env.COPYLEAKS_API_KEY);
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(COPYLEAKS_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.COPYLEAKS_EMAIL,
      key: process.env.COPYLEAKS_API_KEY,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Copyleaks auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
  return cachedToken.token;
}

/**
 * Submit a paper for external plagiarism checking via Copyleaks.
 * Results are delivered asynchronously via webhook to /api/webhooks/copyleaks.
 */
export async function submitPlagiarismCheck(
  paperId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isPlagiarismCheckEnabled()) {
    await db.paper.update({
      where: { id: paperId },
      data: { plagiarismStatus: "SKIPPED" },
    });
    return { success: true };
  }

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { title: true, abstract: true, content: true },
  });

  if (!paper) return { success: false, error: "Paper not found" };

  const textToScan = [paper.title, paper.abstract, paper.content ?? ""]
    .filter(Boolean)
    .join("\n\n");

  if (textToScan.length < 100) {
    await db.paper.update({
      where: { id: paperId },
      data: { plagiarismStatus: "SKIPPED" },
    });
    return { success: true };
  }

  try {
    await db.paper.update({
      where: { id: paperId },
      data: { plagiarismStatus: "PENDING" },
    });

    const token = await getAccessToken();
    const webhookBase = `${process.env.AUTH_URL}/api/webhooks/copyleaks`;

    const res = await fetch(
      `${COPYLEAKS_API_URL}/scans/submit/file/${paperId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          base64: Buffer.from(textToScan).toString("base64"),
          filename: "paper.txt",
          properties: {
            webhooks: {
              status: `${webhookBase}/{STATUS}/${paperId}`,
            },
            sandbox: process.env.NODE_ENV !== "production",
          },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      await db.paper.update({
        where: { id: paperId },
        data: { plagiarismStatus: "FAILED" },
      });
      return {
        success: false,
        error: `Copyleaks: ${res.status} ${errText.slice(0, 200)}`,
      };
    }

    await db.paper.update({
      where: { id: paperId },
      data: { plagiarismCheckId: paperId },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await db.paper.update({
      where: { id: paperId },
      data: { plagiarismStatus: "FAILED" },
    });
    return { success: false, error: `Plagiarism check failed: ${message}` };
  }
}

/**
 * Check the status of a previously submitted plagiarism check.
 * Results arrive via webhook — this is for status queries only.
 */
export async function fetchPlagiarismResult(
  paperId: string,
): Promise<{ success: boolean; score?: number; error?: string }> {
  if (!isPlagiarismCheckEnabled()) {
    return { success: false, error: "Plagiarism check not configured" };
  }

  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      plagiarismCheckId: true,
      plagiarismStatus: true,
      plagiarismScore: true,
    },
  });

  if (!paper?.plagiarismCheckId) {
    return { success: false, error: "No plagiarism check found" };
  }

  if (paper.plagiarismStatus === "COMPLETE") {
    return { success: true, score: paper.plagiarismScore ?? undefined };
  }

  if (paper.plagiarismStatus === "PENDING") {
    return { success: true };
  }

  return { success: false, error: `Status: ${paper.plagiarismStatus}` };
}
