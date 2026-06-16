"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";

interface DownloadPdfButtonProps {
  paperId: string;
  title: string;
  version?: number;
}

export function DownloadPdfButton({ paperId, title, version }: DownloadPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsLoading(true);
    setError(null);

    try {
      const vParam = version ? `?v=${version}` : "";
      const res = await fetch(`/api/papers/${paperId}/pdf${vParam}`);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Failed to generate PDF");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to generate PDF");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileDown className="mr-1 h-3.5 w-3.5" />
        )}
        {isLoading ? "Generating..." : "PDF"}
      </Button>
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
